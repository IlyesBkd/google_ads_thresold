/**
 * Order delivery service
 * Handles credential assignment, token generation, and email sending
 */

import { query, queryOne, execute } from './db';
import { sendCredentialsEmail } from './email';
import { Order, StockItem, DownloadToken, Product } from './types';
import crypto from 'crypto';

/**
 * Deliver an order: assign credentials, create download token, send email
 */
export async function deliverOrder(
  orderId: string,
  adminId?: string
): Promise<{
  success: boolean;
  error?: string;
  deliveredCount?: number;
  downloadToken?: string;
}> {
  try {
    // 1. Get order details
    const order = await queryOne<Order & { product_name: string }>(
      `SELECT o.*, p.name as product_name
       FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    if (order.status === 'delivered') {
      return { success: false, error: 'Order already delivered' };
    }

    if (order.status !== 'paid') {
      return { success: false, error: 'Order must be paid before delivery' };
    }

    // 2. Check available stock
    const availableStock = await query<StockItem>(
      `SELECT * FROM stock_items
       WHERE product_id = $1 AND status = 'available'
       LIMIT $2`,
      [order.product_id, order.quantity]
    );

    if (availableStock.length < order.quantity) {
      return {
        success: false,
        error: `Insufficient stock: need ${order.quantity}, have ${availableStock.length}`,
      };
    }

    // 3. Assign credentials to order (mark as sold)
    const credentialIds = availableStock.map((c) => c.id);
    await execute(
      `UPDATE stock_items
       SET status = 'sold', order_id = $1, updated_at = NOW()
       WHERE id = ANY($2::text[])`,
      [orderId, credentialIds]
    );

    // 4. Update order status
    await execute(
      `UPDATE orders
       SET status = 'delivered', delivered_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [orderId]
    );

    // 5. Generate download token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(
      expiresAt.getHours() +
      parseInt(process.env.DOWNLOAD_LINK_VALIDITY_HOURS || '24')
    );

    await execute(
      `INSERT INTO download_tokens (order_id, token, expires_at, max_uses)
       VALUES ($1, $2, $3, $4)`,
      [
        orderId,
        token,
        expiresAt.toISOString(),
        parseInt(process.env.DOWNLOAD_LINK_MAX_USES || '3'),
      ]
    );

    // 6. Send email
    const emailResult = await sendCredentialsEmail(
      order.customer_email,
      orderId,
      order.product_name,
      token,
      expiresAt
    );

    if (!emailResult.success) {
      // Log email error but don't fail delivery
      await execute(
        `INSERT INTO logs (type, message, admin_id, order_id)
         VALUES ('error', $1, $2, $3)`,
        [
          `Email delivery failed for order ${orderId}: ${emailResult.error}`,
          adminId || null,
          orderId,
        ]
      );
    }

    // 7. Log delivery
    await execute(
      `INSERT INTO logs (type, message, admin_id, order_id)
       VALUES ('delivery', $1, $2, $3)`,
      [
        `Order ${orderId} delivered: ${order.quantity}x ${order.product_name} to ${order.customer_email}`,
        adminId || null,
        orderId,
      ]
    );

    return {
      success: true,
      deliveredCount: credentialIds.length,
      downloadToken: token,
    };
  } catch (error: any) {
    console.error('Delivery error:', error);
    return { success: false, error: error.message || 'Delivery failed' };
  }
}

/**
 * Get credentials for a download token
 */
export async function getCredentialsForToken(
  token: string
): Promise<{
  success: boolean;
  error?: string;
  credentials?: Array<{ email: string; password: string }>;
  orderId?: string;
  productName?: string;
}> {
  try {
    // 1. Validate token
    const tokenData = await queryOne<DownloadToken>(
      `SELECT * FROM download_tokens WHERE token = $1`,
      [token]
    );

    if (!tokenData) {
      return { success: false, error: 'Invalid download link' };
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return { success: false, error: 'Download link has expired' };
    }

    if (tokenData.uses_count >= tokenData.max_uses) {
      return { success: false, error: 'Download limit reached' };
    }

    // 2. Get order and credentials
    const order = await queryOne<Order & { product_name: string }>(
      `SELECT o.*, p.name as product_name
       FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE o.id = $1`,
      [tokenData.order_id]
    );

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    const credentials = await query<StockItem>(
      `SELECT email, password FROM stock_items
       WHERE order_id = $1 AND status = 'sold'`,
      [tokenData.order_id]
    );

    // 3. Increment use count
    await execute(
      `UPDATE download_tokens
       SET uses_count = uses_count + 1
       WHERE id = $1`,
      [tokenData.id]
    );

    return {
      success: true,
      credentials: credentials.map((c) => ({
        email: c.email,
        password: c.password,
      })),
      orderId: order.id,
      productName: order.product_name,
    };
  } catch (error: any) {
    console.error('Get credentials error:', error);
    return { success: false, error: error.message || 'Failed to retrieve credentials' };
  }
}
