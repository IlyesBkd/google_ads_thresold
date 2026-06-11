#!/usr/bin/env tsx
/**
 * Test script to create a test order and trigger delivery
 * Usage: npx tsx db/test-delivery.ts
 */

import 'dotenv/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { query, execute, closePool } from '../lib/db';
import { deliverOrder } from '../lib/delivery';

async function testDelivery() {
  try {
    console.log('🧪 Creating test order...\n');

    // 1. Get a product
    const products = await query(`SELECT * FROM products WHERE id = 'PROD-350' LIMIT 1`);
    const product = products[0];

    if (!product) {
      console.error('❌ Product not found');
      return;
    }

    // 2. Check available stock
    const stock = await query(
      `SELECT COUNT(*) as count FROM stock_items WHERE product_id = $1 AND status = 'available'`,
      [product.id]
    );

    const availableCount = parseInt(stock[0].count);
    console.log(`📦 Product: ${product.name}`);
    console.log(`📥 Available stock: ${availableCount}`);

    if (availableCount < 1) {
      console.error('❌ No stock available. Import credentials first.');
      return;
    }

    // 3. Create a test order
    const testEmail = `test-${Date.now()}@example.com`;
    const orderId = `ORD-TEST-${Date.now()}`;

    await execute(
      `INSERT INTO orders (id, product_id, quantity, customer_email, amount, coin, status, wallet_address, tx_hash, created_at, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        orderId,
        product.id,
        1, // quantity
        testEmail,
        product.price, // amount in cents
        'BTC',
        'paid', // Mark as paid so we can deliver
        'bc1q8c6f92ptnvz0e7yd3k4r5s9w2x8m4l0q7h3n6',
        'test_tx_hash_' + Date.now(),
      ]
    );

    console.log(`✅ Order created: ${orderId}`);
    console.log(`📧 Customer: ${testEmail}`);
    console.log(`💰 Amount: $${product.price / 100}\n`);

    // 4. Deliver the order
    console.log('📤 Triggering delivery...\n');

    const deliveryResult = await deliverOrder(orderId);

    if (!deliveryResult.success) {
      console.error(`❌ Delivery failed: ${deliveryResult.error}`);
      return;
    }

    console.log('✅ Order delivered successfully!');
    console.log(`📦 Credentials assigned: ${deliveryResult.deliveredCount}`);
    console.log(`🔑 Download token: ${deliveryResult.downloadToken}\n`);

    // 5. Show download URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const downloadUrl = `${appUrl}/download/${deliveryResult.downloadToken}`;

    console.log('═══════════════════════════════════════════════════════');
    console.log('📬 DELIVERY COMPLETE');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Order ID:      ${orderId}`);
    console.log(`Customer:      ${testEmail}`);
    console.log(`Download URL:  ${downloadUrl}`);
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('🎉 Test successful! You can now:');
    console.log(`   1. Open the download URL in a browser`);
    console.log(`   2. Check the admin panel at /admin (Orders section)`);
    console.log(`   3. Check if email was sent (if EMAIL_API_KEY is configured)\n`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await closePool();
  }
}

testDelivery();
