import config from './config.js';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const isProd = process.env.NODE_ENV === 'production';

function serializeError(err) {
  if (!(err instanceof Error)) return err;
  return { name: err.name, message: err.message, stack: isProd ? undefined : err.stack };
}

function write(level, scope, msg, meta) {
  if (LEVELS[level] < (LEVELS[config.logLevel] ?? LEVELS.info)) return;
  const fields = {};
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      fields[k] = typeof v === 'bigint' ? v.toString() : serializeError(v);
    }
  }
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  if (isProd) {
    out(JSON.stringify({ ts: new Date().toISOString(), level, scope, msg, ...fields }));
  } else {
    const extra = Object.keys(fields).length ? ` ${JSON.stringify(fields)}` : '';
    out(`${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} [${scope}] ${msg}${extra}`);
  }
}

/** Structured logger: JSON lines in production, readable lines in development. */
export function createLogger(scope) {
  return {
    debug: (msg, meta) => write('debug', scope, msg, meta),
    info: (msg, meta) => write('info', scope, msg, meta),
    warn: (msg, meta) => write('warn', scope, msg, meta),
    error: (msg, meta) => write('error', scope, msg, meta),
  };
}

export default createLogger;
