#!/usr/bin/env tsx
// Migration 010 - Record where a buyer came from and how to reach them.
//
// Country only, never the IP: the published privacy policy states the IP is
// used for rate limiting and not kept alongside the order. A two-letter country
// is far less identifying and keeps that statement true.

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function run() {
  try {
    console.log('🚀 Migration 010: buyer origin...');

    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS country CHAR(2)`;
    console.log('✅ orders.country added');

    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS telegram_username TEXT`;
    console.log('✅ orders.telegram_username added');

    await sql`CREATE INDEX IF NOT EXISTS idx_orders_country ON orders(country) WHERE country IS NOT NULL`;
    console.log('✅ index created');

    console.log('\n🎉 Migration 010 complete');
  } catch (e) {
    console.error('❌', e);
    process.exit(1);
  }
}
run();
