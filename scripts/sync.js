#!/usr/bin/env node

/**
 * Wrapper script for sync service
 * Loads environment variables before importing modules
 */

// Load environment variables synchronously before importing modules
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local synchronously
const envPath = join(__dirname, '../.env.local');
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
  console.log('✅ Loaded environment variables from .env.local');
} catch (error) {
  console.error('❌ Error loading .env.local:', error.message);
  console.error(`   Path: ${envPath}`);
  console.error('   Please create .env.local file in the project root');
  process.exit(1);
}

// Verify required variables
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

if (!process.env.ETHEREUM_RPC_URL) {
  console.error('❌ ETHEREUM_RPC_URL not found in .env.local');
  process.exit(1);
}

// Now dynamically import and run the sync service
// This ensures env vars are loaded before mongodb.js is evaluated
(async () => {
  try {
    await import('../src/lib/sync-service.js');
  } catch (error) {
    console.error('Failed to start sync service:', error);
    process.exit(1);
  }
})();

