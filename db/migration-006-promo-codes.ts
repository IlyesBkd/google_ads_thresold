#!/usr/bin/env tsx
// Migration 006 - Add promo_code column to orders (simple env-var promo system)

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function run() {
  try {
    console.log('🚀 Migration 006: Adding promo_code column to orders...');

    // Add promo_code column to orders if not exists
    await sql`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS promo_code VARCHAR(32) NULL
    `;
    console.log('✅ promo_code column added to orders');

    // Drop promo_codes table if it was created by the old complex version
    await sql`DROP TABLE IF EXISTS promo_codes`;
    console.log('✅ promo_codes table dropped (no longer needed)');

    console.log('\n🎉 Migration 006 complete');
  } catch (e) {
    console.error('❌', e);
    process.exit(1);
  }
}
run();
