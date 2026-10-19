#!/usr/bin/env node
/** Start and supervise the local chain, database, indexer and explorer. */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, createWriteStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { devnetEnv as env, webPort as port } from './load-env.js';
import { ownedHealth, portInUse, probeExplorer } from './runtime.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const stateDir = join(root, '.devnet');
mkdirSync(join(stateDir, 'mongo'), { recursive: true });
const children = [];
let stopping = false;
env.NODE_ENV = 'development';
env.DEVNET_INSTANCE_ID = randomUUID();

function start(name, command, args, visible = false) {
  const log = createWriteStream(join(stateDir, `${name}.log`), { flags: 'a' });
  const child = spawn(command, args, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push({ name, child });
  for (const stream of [child.stdout, child.stderr]) {
    stream.pipe(log, { end: false });
    if (visible) stream.on('data', (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  }
  child.on('error', (error) => { console.error(`${name}: ${error.message}`); shutdown(1); });
  child.on('exit', (code) => {
    log.end();
    if (!stopping) { console.error(`${name} exited (${code}); see .devnet/${name}.log`); shutdown(1); }
  });
  return child;
}
async function rpc(method, params = []) {
  const response = await fetch(env.ETHEREUM_RPC_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(2000) });
  const body = await response.json();
  if (body.error) throw new Error(body.error.message);
  return body.result;
}
async function mongoReady() {
  const client = new mongoose.mongo.MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 1000 });
  try { await client.connect(); await client.db().command({ ping: 1 }); return true; } finally { await client.close(); }
}
async function ready(fn, name) {
  const deadline = Date.now() + 30_000;
  while (!stopping && Date.now() < deadline) {
    try { await fn(); if (!stopping) return; } catch { /* retry until ready or stopped */ }
    if (!stopping) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${name} did not become ready; inspect .devnet/${name}.log`);
}
async function run(script) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { cwd: root, env, stdio: 'inherit' });
    children.push({ name: script, child });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${script} exited (${code})`)));
  });
}
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  console.log('\nStopping devnet services started by this command; data is preserved in .devnet/.');
  const deadline = setTimeout(() => {
    for (const { child } of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    process.exit(code);
  }, 20_000);
  deadline.unref();
  process.exitCode = code;
  const stop = async (entries) => Promise.all(entries.map(({ child }) => new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null || !child.pid) return resolve();
    child.once('exit', resolve);
    child.kill('SIGTERM');
  })));
  // Drain application work while its database and RPC are still available.
  const infrastructure = new Set(['anvil', 'mongo']);
  await stop(children.filter(({ name }) => !infrastructure.has(name)));
  await stop(children.filter(({ name }) => infrastructure.has(name)));
  clearTimeout(deadline);
}
process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());

async function main() {
  // Do this before migrations or workers: another running explorer is not
  // evidence that the web child we are about to spawn has become ready.
  if (await portInUse(port)) {
    const existing = await probeExplorer(env.NEXT_PUBLIC_SITE_URL);
    if (existing) {
      console.log(`Explorer already running at ${env.NEXT_PUBLIC_SITE_URL}${existing.healthy ? '' : ' (readiness is degraded)'}.\nNo additional services were started. Use the existing instance, or stop its original terminal before restarting.`);
    } else {
      console.error(`Port ${port} is already in use by another service. No devnet services were started.\nStop that service, or choose a free port: DEVNET_WEB_PORT=3019 npm run devnet`);
      process.exitCode = 1;
    }
    return;
  }
  let chainRunning = false;
  try { chainRunning = Boolean(await rpc('web3_clientVersion')); } catch { /* start it */ }
  if (!chainRunning) {
    const anvil = process.env.ANVIL_BIN || (existsSync(join(homedir(), '.foundry/bin/anvil')) ? join(homedir(), '.foundry/bin/anvil') : 'anvil');
    start('anvil', anvil, ['--host', '127.0.0.1', '--port', '8545', '--chain-id', '31337', '--quiet', '--state', join(stateDir, 'chain.json'), '--preserve-historical-states', '--state-interval', '10']);
  }
  await ready(() => rpc('eth_chainId'), 'anvil');
  if (Number(BigInt(await rpc('eth_chainId'))) !== 31337 || !/anvil/i.test(await rpc('web3_clientVersion'))) throw new Error('Port 8545 is not the expected Anvil devnet');
  let databaseRunning = false;
  try { databaseRunning = await mongoReady(); } catch { /* start it */ }
  if (!databaseRunning) start('mongo', process.env.MONGOD_BIN || 'mongod', ['--dbpath', join(stateDir, 'mongo'), '--port', '27018', '--bind_ip', '127.0.0.1', '--quiet']);
  await ready(mongoReady, 'mongo');
  await run('scripts/create-indexes.js');
  const deploymentFile = join(root, 'scripts/devnet/out/deployments.json');
  const deployed = existsSync(deploymentFile) ? JSON.parse(readFileSync(deploymentFile, 'utf8')) : null;
  const hasSamples = deployed && (await Promise.all(Object.values(deployed.contracts).map((address) => rpc('eth_getCode', [address, 'latest'])))).every((code) => code && code !== '0x');
  if (!hasSamples) await run('scripts/devnet/seed.js');
  start('web', process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)], true);
  await ready(() => ownedHealth(`${env.NEXT_PUBLIC_SITE_URL}/api/health?live=1`, env.DEVNET_INSTANCE_ID), 'web');
  start('indexer', process.execPath, ['scripts/sync.js'], true);
  start('verifier', process.execPath, ['scripts/verify-worker.js'], true);
  await ready(() => ownedHealth(`${env.NEXT_PUBLIC_SITE_URL}/api/health`, env.DEVNET_INSTANCE_ID), 'web');
  console.log(`\nExplorer ready: ${env.NEXT_PUBLIC_SITE_URL}\nRPC: ${env.ETHEREUM_RPC_URL} (chain 31337)\nRun npm run devnet:test in another terminal. Logs and persisted state: .devnet/`);
}
try {
  await main();
} catch (error) {
  console.error(error.message);
  await shutdown(1);
}
