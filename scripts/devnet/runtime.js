import { createServer } from 'node:net';

/** Probe the same loopback interface used by the devnet web server. */
export function portInUse(port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', (error) => error.code === 'EADDRINUSE' ? resolve(true) : reject(error));
    server.listen({ host: '127.0.0.1', port, exclusive: true }, () => server.close(() => resolve(false)));
  });
}

/** Recognise an existing explorer without assuming every HTTP server is ours. */
export async function probeExplorer(base, fetcher = fetch) {
  try {
    const response = await fetcher(`${base}/api/health`, { signal: AbortSignal.timeout(3000), cache: 'no-store' });
    const body = await response.json();
    if (![200, 503].includes(response.status) || !['ok', 'degraded'].includes(body.status)) return null;
    if (!['database', 'rpc', 'indexer'].every((key) => typeof body.checks?.[key]?.ok === 'boolean')) return null;
    return { healthy: response.ok && body.status === 'ok' };
  } catch { return null; }
}

/** Never mistake a different process's healthy endpoint for our new child. */
export async function ownedHealth(url, instance, fetcher = fetch) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(5000), cache: 'no-store' });
  if (response.headers.get('x-devnet-instance') !== instance) throw new Error('Health response belongs to a different web process');
  if (!response.ok) throw new Error(`Web health returned HTTP ${response.status}`);
}
