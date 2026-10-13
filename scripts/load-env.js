/**
 * Load .env.local then .env (first value wins), mirroring Next.js precedence.
 * Imported first by every CLI entry point so configuration is in place before
 * application modules are evaluated.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const file of ['.env.local', '.env']) {
  const path = join(root, file);
  if (existsSync(path)) dotenv.config({ path, quiet: true });
}

export const projectRoot = root;
