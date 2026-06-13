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
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gadscale.io';
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
         ('starter', 'Starter Threshold Account', 'Google Ads account with €5 already spent — eligible for the €400 free credit promo. Buy for $50, unlock up to €400 in free ads. 8x ROI potential.', 50 * 100, 10, 'threshold', 5, true),
         ('pro', 'Pro Threshold Account', 'Higher-tier account with €10 spent and a €50 threshold — promo-eligible with more spending room. Buy for $75, unlock up to €400 in free ads. Best value.', 75 * 100, 50, 'threshold', 5, true)
       ON CONFLICT (id) DO NOTHING`
    );
    console.log('✅ 2 products created\n');

    // ─── 5. Insert default settings ──────────────────────────────────────────
    console.log('⚙️  Creating default settings...');
    const defaultSettings = [
      { key: 'min_alert_350', value: '5' },
      { key: 'min_alert_500', value: '5' },
      { key: 'download_validity_hours', value: process.env.DOWNLOAD_LINK_VALIDITY_HOURS || '24' },
      { key: 'download_max_uses', value: process.env.DOWNLOAD_LINK_MAX_USES || '3' },
      { key: 'discord_webhook_url', value: process.env.DISCORD_WEBHOOK_URL || '' },
      { key: 'telegram_username', value: process.env.TELEGRAM_SUPPORT_USERNAME || '@Selling_GAds' },
      { key: 'telegram_bot_token', value: process.env.TELEGRAM_BOT_TOKEN || '' },
      { key: 'telegram_channel_id', value: process.env.TELEGRAM_CHANNEL_ID || '' },
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

    // ─── 6. Verify setup ─────────────────────────────────────────────────────
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
