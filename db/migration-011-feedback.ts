#!/usr/bin/env tsx
// Migration 011 - Track feedback requests so no buyer is asked twice.

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function run() {
  try {
    console.log('🚀 Migration 011: feedback requests...');

    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS feedback_sent_at TIMESTAMPTZ`;
    console.log('✅ orders.feedback_sent_at added');

    console.log('\n🎉 Migration 011 complete');
  } catch (e) {
    console.error('❌', e);
    process.exit(1);
  }
}
run();
