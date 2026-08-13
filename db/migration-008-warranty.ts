#!/usr/bin/env tsx
// Migration 008 - Warranty claims against delivered orders.

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function run() {
  try {
    console.log('🚀 Migration 008: warranty claims...');

    await sql`
      CREATE TABLE IF NOT EXISTS warranty_claims (
        id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        email       TEXT NOT NULL,
        reason      TEXT NOT NULL,
        details     TEXT,
        status      TEXT NOT NULL DEFAULT 'open',
        resolution  TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      )
    `;
    console.log('✅ warranty_claims created');

    // One open claim per order — a buyer cannot stack requests.
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_claim_open_per_order
        ON warranty_claims(order_id) WHERE status = 'open'
    `;
    console.log('✅ unique open-claim index created');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_claims_status
        ON warranty_claims(status, created_at DESC)
    `;
    console.log('✅ status index created');

    console.log('\n🎉 Migration 008 complete');
  } catch (e) {
    console.error('❌', e);
    process.exit(1);
  }
}
run();
