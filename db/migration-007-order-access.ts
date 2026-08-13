#!/usr/bin/env tsx
// Migration 007 - One-time codes guarding customer order lookup.
// Before this, /api/orders/by-email returned a live download token to anyone
// who knew the buyer's email address.

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function run() {
  try {
    console.log('🚀 Migration 007: order access codes...');

    await sql`
      CREATE TABLE IF NOT EXISTS order_access_codes (
        id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        email       TEXT NOT NULL,
        code_hash   TEXT NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        attempts    INTEGER NOT NULL DEFAULT 0,
        consumed_at TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✅ order_access_codes created');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_access_email
        ON order_access_codes(email, expires_at DESC)
    `;
    console.log('✅ index created');

    // Generic counter table for rate limiting, keyed by "scope:identifier".
    await sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        bucket      TEXT PRIMARY KEY,
        hits        INTEGER NOT NULL DEFAULT 0,
        window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✅ rate_limits created');

    console.log('\n🎉 Migration 007 complete');
  } catch (e) {
    console.error('❌', e);
    process.exit(1);
  }
}
run();
