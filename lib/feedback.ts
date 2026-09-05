/**
 * Feedback requests to past buyers.
 *
 * Sent by hand from the admin rather than on a schedule: this is an outbound
 * message to real customers, and pressing a button beats a cron deciding on
 * its own when to mail people.
 *
 * Asked once per buyer, never per order — someone with two orders gets one
 * email. `preview` exists so the list can be read before anything is sent.
 */

import { query, execute } from './db';
import { sendFeedbackRequestEmail } from './email';

/** Give a buyer time to actually use the account before asking about it. */
export const MIN_DAYS_SINCE_DELIVERY = 3;

export interface FeedbackCandidate {
  email: string;
  productName: string;
  daysSinceDelivery: number;
  orders: number;
}

async function candidates(minDays: number): Promise<FeedbackCandidate[]> {
  const rows = await query<{
    customer_email: string;
    product_name: string;
    days: string;
    orders: string;
  }>(
    `SELECT o.customer_email,
            MIN(p.name) as product_name,
            FLOOR(EXTRACT(EPOCH FROM (NOW() - MAX(o.delivered_at))) / 86400) as days,
            COUNT(*) as orders
     FROM orders o
     JOIN products p ON p.id = o.product_id
     WHERE o.status = 'delivered'
       AND o.feedback_sent_at IS NULL
     GROUP BY o.customer_email
     HAVING MAX(o.delivered_at) <= NOW() - make_interval(days => $1::int)
     ORDER BY MAX(o.delivered_at) DESC`,
    [minDays]
  );

  return rows.map((r) => ({
    email: r.customer_email,
    productName: r.product_name,
    daysSinceDelivery: parseInt(r.days, 10),
    orders: parseInt(r.orders, 10),
  }));
}

/** Who would be emailed, without sending anything. */
export function previewFeedbackRequests(
  minDays: number = MIN_DAYS_SINCE_DELIVERY
): Promise<FeedbackCandidate[]> {
  return candidates(minDays);
}

export async function sendFeedbackRequests(
  minDays: number = MIN_DAYS_SINCE_DELIVERY,
  adminId?: string
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const list = await candidates(minDays);
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  for (const person of list) {
    // Claim before sending so a double click cannot mail anyone twice; every
    // delivered order of theirs is stamped, since the ask is per buyer.
    const claimed = await execute(
      `UPDATE orders SET feedback_sent_at = NOW()
       WHERE customer_email = $1 AND status = 'delivered' AND feedback_sent_at IS NULL`,
      [person.email]
    );

    if (claimed === 0) continue;

    const result = await sendFeedbackRequestEmail(person.email, person.productName);

    if (result.success) {
      sent++;
    } else {
      failed++;
      errors.push(`${person.email}: ${result.error}`);
      // Let a later run retry rather than silently dropping them.
      await execute(
        `UPDATE orders SET feedback_sent_at = NULL
         WHERE customer_email = $1 AND status = 'delivered'`,
        [person.email]
      );
    }
  }

  if (sent > 0) {
    await execute('INSERT INTO logs (type, message, admin_id) VALUES ($1, $2, $3)', [
      'sale',
      `${sent} feedback request(s) emailed to past buyers`,
      adminId || null,
    ]);
  }

  return { sent, failed, errors };
}
