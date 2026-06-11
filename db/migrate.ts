#!/usr/bin/env tsx
/**
 * Database migration script for Neon PostgreSQL
 * Usage: npx tsx db/migrate.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from project root
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { Pool, neonConfig } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as bcrypt from 'bcryptjs';
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

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...\n');

    // ─── 1. Run schema.sql ───────────────────────────────────────────────────
    console.log('📋 Creating tables from schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    // Execute entire schema at once (Pool supports raw SQL)
    await pool.query(schemaSql);
    console.log('✅ Schema created successfully\n');

    // ─── 2. Hash admin password and prepare seed ────────────────────────────
    console.log('🔐 Hashing admin password...');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@adscale.io';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!';
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    console.log(`✅ Admin: ${adminEmail}\n`);

    // ─── 3. Insert admin ─────────────────────────────────────────────────────
    console.log('👤 Creating admin account...');
    await pool.query(
      `INSERT INTO admins (id, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $3`,
      ['admin-001', adminEmail, passwordHash, 'owner']
    );
    console.log('✅ Admin created\n');

    // ─── 4. Insert products ──────────────────────────────────────────────────
    console.log('📦 Creating products...');
    await pool.query(
      `INSERT INTO products (id, name, description, price, threshold_value, category, low_stock_alert, active)
       VALUES
         ('PROD-350', '$350 Threshold Account', 'Aged, fully verified Google Ads account with $350 billing threshold unlocked — spend first, pay Google later. Delivered instantly as .txt credentials with login + recovery details.', 18900, 350, 'threshold', 5, true),
         ('PROD-500', '$500 Threshold Account', 'Higher-limit account with a $500 threshold and extended billing history — built to scale spend from day one. Includes login + recovery details with priority support.', 27900, 500, 'threshold', 5, true)
       ON CONFLICT (id) DO NOTHING`
    );
    console.log('✅ 2 products created\n');

    // ─── 5. Insert sample stock ──────────────────────────────────────────────
    console.log('📥 Creating sample stock...');
    const sampleStock = [
      { productId: 'PROD-350', email: 'threshold.acc88@gmail.com', password: 'Ads!Thresh88x' },
      { productId: 'PROD-350', email: 'googleads.user001@gmail.com', password: 'Thr3sh0ld!2024' },
      { productId: 'PROD-350', email: 'adspro.buyer42@gmail.com', password: 'G00gl3Ads$ecure' },
      { productId: 'PROD-500', email: 'gads.premium19@gmail.com', password: 'Pr3m1um#Gads19' },
      { productId: 'PROD-500', email: 'adsthresh.elite7@gmail.com', password: 'El1te7!Threshold' },
      { productId: 'PROD-500', email: 'threshold.500pro@gmail.com', password: '500Pr0!G00gle' },
    ];

    for (const item of sampleStock) {
      await pool.query(
        `INSERT INTO stock_items (product_id, email, password, status)
         VALUES ($1, $2, $3, 'available')
         ON CONFLICT (email, product_id) DO NOTHING`,
        [item.productId, item.email, item.password]
      );
    }
    console.log('✅ 6 sample credentials created\n');

    // ─── 6. Insert default settings ──────────────────────────────────────────
    console.log('⚙️  Creating default settings...');
    const defaultSettings = [
      { key: 'wallet_btc', value: process.env.NEXT_PUBLIC_WALLET_BTC || 'bc1q8c6f92ptnvz0e7yd3k4r5s9w2x8m4l0q7h3n6' },
      { key: 'wallet_eth', value: process.env.NEXT_PUBLIC_WALLET_ETH || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
      { key: 'wallet_usdt', value: process.env.NEXT_PUBLIC_WALLET_USDT || 'TQn9Y2khEsLJW1ChVWFMSMeRDow5Kcbk8e' },
      { key: 'min_alert_350', value: '5' },
      { key: 'min_alert_500', value: '5' },
      { key: 'download_validity_hours', value: process.env.DOWNLOAD_LINK_VALIDITY_HOURS || '24' },
      { key: 'download_max_uses', value: process.env.DOWNLOAD_LINK_MAX_USES || '3' },
      { key: 'discord_webhook_url', value: process.env.DISCORD_WEBHOOK_URL || '' },
      { key: 'telegram_username', value: process.env.TELEGRAM_SUPPORT_USERNAME || '@adscale_support' },
    ];

    for (const setting of defaultSettings) {
      await pool.query(
        `INSERT INTO settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [setting.key, setting.value]
      );
    }
    console.log('✅ Default settings created\n');

    // ─── 7. Insert initial log ───────────────────────────────────────────────
    await pool.query(
      `INSERT INTO logs (type, message, admin_id)
       VALUES ('import', 'Database seeded with 2 products and 6 sample credentials', 'admin-001')`
    );

    // ─── 7. Verify setup ─────────────────────────────────────────────────────
    const productCount = await pool.query('SELECT COUNT(*) as count FROM products');
    const stockCount = await pool.query("SELECT COUNT(*) as count FROM stock_items WHERE status = 'available'");
    const adminCount = await pool.query('SELECT COUNT(*) as count FROM admins');

    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 Migration completed successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📦 Products: ${productCount.rows[0].count}`);
    console.log(`📥 Available stock: ${stockCount.rows[0].count}`);
    console.log(`👤 Admins: ${adminCount.rows[0].count}`);
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('✅ You can now log in to /admin with:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
