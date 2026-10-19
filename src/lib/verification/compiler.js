/**
 * Solidity compiler management.
 *
 * Compiler builds (soljson) are downloaded from SOLC_BINARIES_URL on first
 * use, checked against the sha256 published in list.json, and cached in
 * SOLC_CACHE_DIR. The solc version bundled with the `solc` npm package works
 * offline. Compilations run in a worker thread with a timeout and a small
 * concurrency limit so they never block the HTTP event loop.
 */
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import config from '../config.js';
import { createLogger } from '../logger.js';

const log = createLogger('solc');
const COMPILE_TIMEOUT_MS = 120_000;
const MAX_PARALLEL = 2;
const MAX_QUEUED = 8;
const require = createRequire(import.meta.url);

let bundledVersion = null;
function getBundledVersion() {
  if (bundledVersion) return bundledVersion;
  try {
    bundledVersion = require('solc').version().replace(/\.Emscripten\.clang$/, '');
  } catch {
    bundledVersion = null;
  }
  return bundledVersion;
}

const listCache = { at: 0, data: null };

async function fetchList() {
  if (listCache.data && Date.now() - listCache.at < 3600_000) return listCache.data;
  const res = await fetch(`${config.solcBinariesUrl}/list.json`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`compiler list unavailable (HTTP ${res.status})`);
  const data = await res.json();
  listCache.data = data;
  listCache.at = Date.now();
  return data;
}

/** All available compiler versions, newest first (long form, e.g. "v0.8.26+commit.8a97fa7a"). */
export async function listCompilerVersions() {
  try {
    const list = await fetchList();
    const bundled = getBundledVersion();
    const versions = list.builds
      .filter((b) => !b.prerelease)
      .map((b) => `v${b.longVersion}`)
      .reverse();
    return [...new Set([...(bundled ? [`v${bundled}`] : []), ...versions])];
  } catch (err) {
    log.warn('falling back to bundled compiler list', { err: err.message });
    const v = getBundledVersion();
    return v ? [`v${v}`] : [];
  }
}

/** Accepts "0.8.20", "v0.8.20", "v0.8.20+commit.a1b79de6". */
export function parseVersion(v) {
  const m = String(v ?? '').trim().match(/^v?(\d+\.\d+\.\d+)(\+commit\.[0-9a-f]{8})?(?:\.Emscripten\.clang)?$/);
  if (!m) return null;
  return { short: m[1], commit: m[2]?.slice(8) ?? null };
}

async function resolveBuild(version) {
  const parsed = parseVersion(version);
  if (!parsed) throw new Error(`Invalid compiler version "${version}"`);
  const bundled = getBundledVersion();
  const local = parseVersion(bundled);
  if (local?.short === parsed.short && (!parsed.commit || local.commit === parsed.commit)) return { bundled: true, longVersion: bundled };
  const list = await fetchList();
  const build = list.builds.find((b) => b.version === parsed.short && !b.prerelease && (!parsed.commit || b.longVersion.endsWith(parsed.commit)));
  if (!build) throw new Error(`Unknown compiler version ${version}`);
  return { bundled: false, build };
}

const inflight = new Map();

async function ensureSoljson(build) {
  // Runtime cache directory, not part of the build output.
  const dir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), config.solcCacheDir);
  if (!/^soljson-v[0-9a-z.+-]+\.js$/i.test(build.path)) throw new Error('Invalid compiler build path');
  const file = path.join(/*turbopackIgnore: true*/ dir, build.path);
  if (existsSync(file)) {
    const sha = `0x${createHash('sha256').update(readFileSync(file)).digest('hex')}`;
    if (!build.sha256 || sha !== build.sha256) throw new Error('Cached compiler checksum mismatch');
    return file;
  }
  if (inflight.has(file)) return inflight.get(file);
  const p = (async () => {
    await mkdir(dir, { recursive: true });
    log.info('downloading compiler', { version: build.longVersion });
    const res = await fetch(`${config.solcBinariesUrl}/${build.path}`, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`compiler download failed (HTTP ${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    const sha = `0x${createHash('sha256').update(buf).digest('hex')}`;
    if (!build.sha256 || sha !== build.sha256) throw new Error('compiler checksum mismatch');
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, buf);
    await rename(tmp, file);
    return file;
  })().finally(() => inflight.delete(file));
  inflight.set(file, p);
  return p;
}

// Simple semaphore for CPU-heavy compilations.
let running = 0;
const queue = [];
async function withSlot(fn) {
  if (queue.length >= MAX_QUEUED) throw new Error('Compiler queue is full. Try again shortly.');
  if (running >= MAX_PARALLEL) await new Promise((r) => queue.push(r));
  running += 1;
  try {
    return await fn();
  } finally {
    running -= 1;
    queue.shift()?.();
  }
}

function workerPath() {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), 'workers', 'solc-worker.cjs');
}

/**
 * Compile a standard-JSON input with the requested compiler version.
 * @returns {Promise<{ output: object, version: string }>}
 */
export async function compileStandardJson(input, version) {
  const resolved = await resolveBuild(version);
  const soljsonPath = resolved.bundled ? null : await ensureSoljson(resolved.build);
  return withSlot(
    () =>
      new Promise((resolve, reject) => {
        const worker = new Worker(workerPath(), { workerData: { input, soljsonPath }, resourceLimits: { maxOldGenerationSizeMb: 2048 } });
        const timer = setTimeout(() => {
          worker.terminate();
          reject(new Error('Compilation timed out'));
        }, COMPILE_TIMEOUT_MS);
        worker.once('message', (msg) => {
          clearTimeout(timer);
          worker.terminate();
          if (!msg.ok) return reject(new Error(msg.error));
          try {
            resolve({ output: JSON.parse(msg.output), version: msg.version });
          } catch (err) {
            reject(err);
          }
        });
        worker.once('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });
        worker.once('exit', (code) => {
          clearTimeout(timer);
          reject(new Error(`Compiler worker exited before returning a result (${code})`));
        });
      }),
  );
}

export const EVM_VERSIONS = ['default', 'prague', 'cancun', 'shanghai', 'paris', 'london', 'berlin', 'istanbul', 'petersburg', 'constantinople', 'byzantium', 'spuriousDragon', 'tangerineWhistle', 'homestead'];
