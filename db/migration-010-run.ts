#!/usr/bin/env tsx
// Migration 010 — Add full account delivery fields to stock_items.
//
// Run:  DATABASE_URL=... npx tsx db/migration-010-run.ts
//
// Uses the `ws` WebSocket constructor when running under plain Node (no global
// WebSocket), which is what lets the Neon serverless driver connect from a
// container/VPS without the HTTP fetch shim.

import { Pool, neonConfig } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

// Plain Node has no global WebSocket; polyfill with the ws package.
if (typeof (globalThis as any).WebSocket === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  neonConfig.webSocketConstructor = require('ws');
}

const pool = new Pool({ connectionString: DATABASE_URL });

const COLUMNS: Array<[string, string]> = [
  ['cookies', 'TEXT'],
  ['backup_codes', 'TEXT'],
  ['seed_phrase', 'TEXT'],
  ['phone_number', 'TEXT'],
  ['user_agent', 'TEXT'],
  ['recovery_password', 'TEXT'],
];

async function run() {
  try {
    for (const [name, type] of COLUMNS) {
      await pool.query(`ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS ${name} ${type}`);
      console.log(`✅ ${name} (${type})`);
    }

    // Verify
    const r = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'stock_items'
      ORDER BY ordinal_position
    `);
    console.log('\n📊 stock_items columns:', r.rows.map((c) => c.column_name).join(', '));

    await pool.end();
    console.log('\n🎉 Migration 010 complete');
  } catch (e) {
    console.error('❌', e);
    process.exit(1);
  }
}

run();
