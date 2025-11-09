#!/usr/bin/env node

/**
 * Reset Database Script
 * Deletes all data from the ethereum_indexer database for a fresh start
 * 
 * Usage:
 *   node scripts/reset-database.js
 * 
 * Or with confirmation:
 *   node scripts/reset-database.js --confirm
 */

import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '../.env');
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();
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
} catch (error) {
  console.error('Error loading .env:', error.message);
  console.error('   Please create .env file in the project root');
  console.error('   You can copy from .example.env as a reference');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env');
  process.exit(1);
}

const confirm = process.argv.includes('--confirm');

async function resetDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    if (!confirm) {
      console.log('⚠️  WARNING: This will delete ALL data from the database!');
      console.log('   To proceed, run with --confirm flag:');
      console.log('   node scripts/reset-database.js --confirm\n');
      process.exit(0);
    }

    console.log('🗑️  Deleting all data...\n');

    // Delete all collections
    const collections = ['blocks', 'transactions', 'addresses', 'indexerstates'];
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();
      if (count > 0) {
        await collection.deleteMany({});
        console.log(`✅ Deleted ${count} documents from ${collectionName}`);
      } else {
        console.log(`ℹ️  Collection ${collectionName} is already empty`);
      }
    }

    // Reset indexer state
    const startBlock = parseInt(process.env.START_BLOCK || '0', 10);
    
    const indexerStateCollection = db.collection('indexerstates');
    await indexerStateCollection.updateOne(
      { key: 'sync_state' },
      {
        $set: {
          key: 'sync_state',
          lastProcessedBlock: startBlock - 1,
          isSyncing: false,
          totalBlocksIndexed: 0,
          totalTransactionsIndexed: 0,
          lastSyncedAt: new Date(),
        }
      },
      { upsert: true }
    );

    console.log(`\n✅ Indexer state reset to start from block ${startBlock}`);
    console.log('\n🎉 Database reset complete!');
    console.log('   You can now run: npm run sync');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

resetDatabase();

