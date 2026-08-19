#!/usr/bin/env tsx
// Migration 011 — Add `files` column (JSON array of {name, mime, data}) to stock_items.
//
// Run:  DATABASE_URL=... npx tsx db/migration-011-run.ts

import { Pool, neonConfig } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

if (typeof (globalThis as any).WebSocket === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  neonConfig.webSocketConstructor = require('ws');
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function run() {
  try {
    await pool.query(`ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS files TEXT`);
    console.log('✅ files (TEXT)');

    const r = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'stock_items'
      ORDER BY ordinal_position
    `);
    console.log('\n📊 stock_items columns:', r.rows.map((c) => c.column_name).join(', '));

    await pool.end();
    console.log('\n🎉 Migration 011 complete');
  } catch (e) {
    console.error('❌', e);
    process.exit(1);
  }
}

run();
