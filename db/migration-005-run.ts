#!/usr/bin/env tsx
// Migration 005 - Add promo tracking columns to stock_items

import { Pool, neonConfig } from '@neondatabase/serverless';
import * as https from 'https';
import * as http from 'http';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

neonConfig.fetchFunction = (url: string, options: any) => {
  const lib = url.startsWith('https://') ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.request(url, {
      method: options?.method || 'GET',
      headers: options?.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({
        ok: res.statusCode! >= 200 && res.statusCode! < 300,
        status: res.statusCode!,
        text: async () => data,
        json: async () => JSON.parse(data),
      } as any));
    });
    req.on('error', reject);
    if (options?.body) req.write(options.body);
    req.end();
  });
};

const pool = new Pool({ connectionString: DATABASE_URL });

async function run() {
  try {
    console.log('🚀 Adding promo tracking columns...');
    await pool.query(`
      ALTER TABLE stock_items
        ADD COLUMN IF NOT EXISTS google_ads_created_at DATE,
        ADD COLUMN IF NOT EXISTS promo_expires_at DATE;
    `);
    console.log('✅ Columns added');

    // Fill existing accounts with June 21 date
    const upd = await pool.query(`
      UPDATE stock_items
      SET
        google_ads_created_at = '2026-06-21',
        promo_expires_at = '2026-06-21'::DATE + INTERVAL '60 days'
      WHERE google_ads_created_at IS NULL;
    `);
    console.log(`✅ Updated ${upd.rowCount} existing account(s)`);

    const result = await pool.query(`SELECT email, google_ads_created_at, promo_expires_at FROM stock_items ORDER BY email`);
    console.log('\n📊 Updated inventory:');
    for (const row of result.rows) {
      const email = row.email.substring(0, 8).padEnd(25);
      const created = String(row.google_ads_created_at).padEnd(15);
      const expires = String(row.promo_expires_at).padEnd(15);
      console.log(`  ${email} created: ${created} expires: ${expires}`);
    }

    await pool.end();
    console.log('\n🎉 Migration complete');
  } catch (e) {
    console.error('❌', e);
    process.exit(1);
  }
}
run();
