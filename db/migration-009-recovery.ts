#!/usr/bin/env tsx
// Migration 009 - Track abandoned-checkout reminders so each order gets one.

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function run() {
  try {
    console.log('🚀 Migration 009: abandoned checkout recovery...');

    await sql`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS recovery_sent_at TIMESTAMPTZ
    `;
    console.log('✅ orders.recovery_sent_at added');

    // Existing failed orders are backfilled as already-reminded: nobody wants a
    // recovery email about a checkout they abandoned weeks ago.
    const backfilled = await sql`
      UPDATE orders
      SET recovery_sent_at = NOW()
      WHERE status = 'failed' AND recovery_sent_at IS NULL
      RETURNING id
    `;
    console.log(`✅ ${backfilled.length} historical order(s) marked as already reminded`);

    console.log('\n🎉 Migration 009 complete');
  } catch (e) {
    console.error('❌', e);
    process.exit(1);
  }
}
run();
