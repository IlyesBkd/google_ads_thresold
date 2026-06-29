#!/usr/bin/env tsx
/**
 * Non-destructive migration: add totp_secret, recovery_email and proxy
 * columns to the existing stock_items table (preserves all current data).
 *
 * Usage: npx tsx db/add-credential-fields.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from project root
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { Pool, neonConfig } from '@neondatabase/serverless';
import * as https from 'https';
import * as http from 'http';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Configure Neon to use http fetch for Node.js
neonConfig.fetchFunction = (url: string, options: any) => {
  const isHttps = url.startsWith('https://');
  const lib = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = lib.request(url, {
      method: options?.method || 'GET',
      headers: options?.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode! >= 200 && res.statusCode! < 300,
          status: res.statusCode!,
          text: async () => data,
          json: async () => JSON.parse(data),
        } as any);
      });
    });

    req.on('error', reject);
    if (options?.body) req.write(options.body);
    req.end();
  });
};

const pool = new Pool({ connectionString: DATABASE_URL });

async function run() {
  try {
    console.log('🚀 Adding credential fields to stock_items...\n');

    await pool.query(`
      ALTER TABLE stock_items
        ADD COLUMN IF NOT EXISTS totp_secret    TEXT,
        ADD COLUMN IF NOT EXISTS recovery_email TEXT,
        ADD COLUMN IF NOT EXISTS proxy          TEXT
    `);

    console.log('✅ Columns totp_secret, recovery_email, proxy are present.\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
