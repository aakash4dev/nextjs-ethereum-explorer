/** Explicit local-only settings shared by every devnet command. Never load .env. */
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';

Object.assign(process.env, dotenv.parse(readFileSync(new URL('../../.env.devnet.example', import.meta.url))));
export const webPort = Number(process.env.DEVNET_WEB_PORT || 3017);
if (!Number.isInteger(webPort) || webPort < 1 || webPort > 65535) throw new Error('DEVNET_WEB_PORT must be an integer from 1 to 65535');
process.env.NEXT_PUBLIC_SITE_URL = `http://localhost:${webPort}`;
const loopback = (url) => ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname);
if (!loopback(process.env.ETHEREUM_RPC_URL) || !loopback(process.env.MONGODB_URI)) throw new Error('Devnet commands require loopback RPC and database URLs');
if (!new URL(process.env.MONGODB_URI).pathname.endsWith('_devnet')) throw new Error('Devnet database name must end in _devnet');
export const devnetEnv = { ...process.env };
