/**
 * Stock monitoring and alert helper
 */

import { query } from './db';
import { notifyStockAlert } from './discord';

interface StockCheck {
  productId: string;
  currentStock: number;
  threshold: number;
  shouldAlert: boolean;
}

/**
 * Check stock levels and send alerts if needed
 */
export async function checkAndAlertStock(productId?: string): Promise<void> {
  try {
    // Get Discord webhook URL
    const settings = await query<{ key: string; value: string }>(
      "SELECT key, value FROM settings WHERE key = 'discord_webhook_url'",
      []
    );
    const webhookUrl = settings[0]?.value;

    if (!webhookUrl) {
      // No webhook configured, skip alerts
      return;
    }

    // Get products to check
    const productsToCheck = productId
      ? await query<{ id: string; name: string; low_stock_alert: number }>(
          'SELECT id, name, low_stock_alert FROM products WHERE id = $1',
          [productId]
        )
      : await query<{ id: string; name: string; low_stock_alert: number }>(
          'SELECT id, name, low_stock_alert FROM products',
          []
        );

    for (const product of productsToCheck) {
      // Get current stock count
      const stockResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM stock_items
         WHERE product_id = $1 AND status = 'available'`,
        [product.id]
      );

      const currentStock = parseInt(stockResult[0]?.count || '0', 10);
      const threshold = product.low_stock_alert;

      // Send alert if stock is at or below threshold
      if (currentStock <= threshold) {
        await notifyStockAlert(webhookUrl, {
          productId: product.id,
          productName: product.name,
          currentStock,
          threshold,
        });

        console.log(`📢 Stock alert sent for ${product.name}: ${currentStock} units`);

        // Log the alert
        await query(
          `INSERT INTO logs (type, message)
           VALUES ('error', $1)`,
          [`Stock alert: ${product.name} has ${currentStock} units (threshold: ${threshold})`]
        );
      }
    }
  } catch (error) {
    console.error('Stock alert error:', error);
    // Don't throw - alerting is not critical
  }
}

/**
 * Get stock levels for all products
 */
export async function getStockLevels(): Promise<
  Array<{
    productId: string;
    productName: string;
    currentStock: number;
    threshold: number;
    status: 'ok' | 'low' | 'out';
  }>
> {
  const products = await query<{ id: string; name: string; low_stock_alert: number }>(
    'SELECT id, name, low_stock_alert FROM products',
    []
  );

  const levels = [];

  for (const product of products) {
    const stockResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM stock_items
       WHERE product_id = $1 AND status = 'available'`,
      [product.id]
    );

    const currentStock = parseInt(stockResult[0]?.count || '0', 10);
    const threshold = product.low_stock_alert;

    let status: 'ok' | 'low' | 'out' = 'ok';
    if (currentStock === 0) {
      status = 'out';
    } else if (currentStock <= threshold) {
      status = 'low';
    }

    levels.push({
      productId: product.id,
      productName: product.name,
      currentStock,
      threshold,
      status,
    });
  }

  return levels;
}
