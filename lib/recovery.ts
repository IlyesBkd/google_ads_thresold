/**
 * Abandoned checkout recovery.
 *
 * An expired pending order is the email address of someone who was one step
 * from buying. One reminder, sent only when the product is actually back in
 * stock, and never more than once per order.
 */

import { query, execute } from './db';
import { sendAbandonedCheckoutEmail } from './email';

/** Wait this long after expiry so the reminder doesn't tread on the checkout. */
const DELAY_MINUTES = 60;

export async function sendRecoveryEmails(): Promise<{ sent: number; skipped: number }> {
  let sent = 0;
  let skipped = 0;

  try {
    const candidates = await query<{
      id: string;
      customer_email: string;
      product_id: string;
      product_name: string;
      price: number;
      available: string;
    }>(
      `SELECT
         o.id, o.customer_email, o.product_id,
         p.name as product_name, p.price,
         (SELECT COUNT(*) FROM stock_items s
          WHERE s.product_id = o.product_id AND s.status = 'available') as available
       FROM orders o
       JOIN products p ON p.id = o.product_id
       WHERE o.status = 'failed'
         AND o.recovery_sent_at IS NULL
         AND o.paid_at IS NULL
         AND o.updated_at < NOW() - make_interval(mins => $1::int)
         AND o.updated_at > NOW() - INTERVAL '7 days'
         AND p.active = true
       ORDER BY o.updated_at DESC
       LIMIT 50`,
      [DELAY_MINUTES]
    );

    for (const order of candidates) {
      // Reminding someone about something they still can't buy is just noise.
      if (parseInt(order.available, 10) === 0) {
        skipped++;
        continue;
      }

      // Claim it before sending, so a concurrent run can't double-send.
      const claimed = await execute(
        `UPDATE orders SET recovery_sent_at = NOW()
         WHERE id = $1 AND recovery_sent_at IS NULL`,
        [order.id]
      );

      if (claimed === 0) {
        skipped++;
        continue;
      }

      const result = await sendAbandonedCheckoutEmail(
        order.customer_email,
        order.product_name,
        `$${(order.price / 100).toFixed(0)}`
      );

      if (result.success) {
        sent++;
      } else {
        // Let a later run retry rather than silently dropping the buyer.
        await execute('UPDATE orders SET recovery_sent_at = NULL WHERE id = $1', [order.id]);
        skipped++;
      }
    }

    if (sent > 0) {
      await execute(`INSERT INTO logs (type, message) VALUES ('sale', $1)`, [
        `${sent} abandoned checkout reminder(s) sent`,
      ]);
      console.log(`📧 Sent ${sent} recovery email(s), skipped ${skipped}`);
    }
  } catch (error) {
    console.error('Recovery email error:', error);
  }

  return { sent, skipped };
}
