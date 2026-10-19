/**
 * HTTP helpers for route handlers: consistent JSON errors, BigInt-safe
 * serialisation, per-IP rate limiting, cache headers and admin auth.
 */
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import config from './config.js';
import { dbConnect, DatabaseConfigError } from './db.js';
import { HttpError } from './validation.js';
import { createLogger } from './logger.js';

const log = createLogger('api');
export { readBody } from './request-body.js';

const replacer = (_k, v) => (typeof v === 'bigint' ? v.toString() : v);

export function json(data, { status = 200, cache = 'no-store', headers = {} } = {}) {
  return new NextResponse(JSON.stringify(data, replacer), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache, ...headers },
  });
}
/** Cache-Control presets. Indexed history is immutable once deep enough. */
export const CACHE = {
  none: 'no-store',
  short: 'public, max-age=5, s-maxage=5, stale-while-revalidate=10',
  medium: 'public, max-age=30, s-maxage=30, stale-while-revalidate=60',
  long: 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
};

// ---- Rate limiting (fixed window per client IP, per process) ---------------
const buckets = globalThis.__rateBuckets ?? (globalThis.__rateBuckets = new Map());

export function clientIp(req) {
  if (config.trustProxy) {
    const fwd = req.headers.get('x-forwarded-for');
    if (fwd) return fwd.split(',')[0].trim();
    const real = req.headers.get('x-real-ip');
    if (real) return real.trim();
  }
  return 'local';
}

export function rateLimit(req, { cost = 1, limit = config.rateLimitPerMinute } = {}) {
  if (!limit) return null;
  const key = clientIp(req);
  const now = Date.now();
  const windowStart = now - (now % 60_000);
  let b = buckets.get(key);
  if (!b || b.window !== windowStart) {
    b = { window: windowStart, count: 0 };
    buckets.set(key, b);
    if (buckets.size > 50_000) {
      for (const [k, v] of buckets) if (v.window !== windowStart) buckets.delete(k);
    }
  }
  b.count += cost;
  const remaining = Math.max(0, limit - b.count);
  const headers = {
    'x-ratelimit-limit': String(limit),
    'x-ratelimit-remaining': String(remaining),
    'x-ratelimit-reset': String(Math.ceil((windowStart + 60_000) / 1000)),
  };
  if (b.count > limit) return { limited: true, headers: { ...headers, 'retry-after': String(Math.ceil((windowStart + 60_000 - now) / 1000)) } };
  return { limited: false, headers };
}

export function isAdmin(req) {
  const key = config.adminApiKey;
  if (!key) return false;
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '') || req.headers.get('x-api-key') || '';
  const a = Buffer.from(given);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Wrap a route handler: connects to the DB, enforces the rate limit, maps
 * HttpError to JSON responses and hides internal errors in production.
 */
export function withApi(handler, { cost = 1, db = true } = {}) {
  return async (req, ctx) => {
    const rl = rateLimit(req, { cost });
    if (rl?.limited) return json({ error: 'Rate limit exceeded. Try again shortly.' }, { status: 429, headers: rl.headers });
    try {
      if (db) await dbConnect();
      const params = ctx?.params ? await ctx.params : {};
      const res = await handler(req, { params });
      if (rl && res?.headers) for (const [k, v] of Object.entries(rl.headers)) res.headers.set(k, v);
      return res;
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message, details: err.details }, { status: err.status });
      if (err instanceof DatabaseConfigError) return json({ error: err.message }, { status: 503 });
      log.error('unhandled API error', { path: new URL(req.url).pathname, err });
      return json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : String(err?.message ?? err) }, { status: 500 });
    }
  };
}
