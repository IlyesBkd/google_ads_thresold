/**
 * Stock reservation service
 *
 * A pending order holds its credentials in `reserved` until the payment is
 * confirmed. Without this, stock is only claimed at delivery time, so several
 * customers can check out the same last account and all but one pay for nothing.
 *
 * Expiry is derived from `orders.created_at` rather than a dedicated column:
 * an item is stale when it is `reserved` and attached to an order that has been
 * `pending` for longer than RESERVATION_TIMEOUT_MINUTES.
 */

import { query, execute } from './db';
import { getErrorMessage } from './errors';

/** How long a pending order may hold its stock before it is released. */
export function getReservationTimeoutMinutes(): number {
  const parsed = parseInt(process.env.RESERVATION_TIMEOUT_MINUTES || '30', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

/**
 * Release stock held by pending orders that timed out, and fail those orders.
 * Safe to call on any read path — it is a no-op when nothing has expired.
 */
export async function releaseExpiredReservations(): Promise<number> {
  try {
    const timeout = getReservationTimeoutMinutes();

    // Release the stock first, while the orders are still `pending` and can be
    // matched by the subquery below.
    const released = await query<{ id: string }>(
      `UPDATE stock_items
       SET status = 'available', order_id = NULL, updated_at = NOW()
       WHERE status = 'reserved'
         AND order_id IN (
           SELECT id FROM orders
           WHERE status = 'pending'
             AND created_at < NOW() - make_interval(mins => $1::int)
         )
       RETURNING id`,
      [timeout]
    );

    const expiredOrders = await query<{ id: string }>(
      `UPDATE orders
       SET status = 'failed', updated_at = NOW()
       WHERE status = 'pending'
         AND created_at < NOW() - make_interval(mins => $1::int)
       RETURNING id`,
      [timeout]
    );

    if (expiredOrders.length > 0) {
      await execute(
        `INSERT INTO logs (type, message)
         VALUES ('sale', $1)`,
        [
          `${expiredOrders.length} pending order(s) expired after ${timeout}min, ` +
            `${released.length} stock item(s) released`,
        ]
      );

      console.log(
        `⏱️ Expired ${expiredOrders.length} pending order(s), released ${released.length} item(s)`
      );
    }

    return released.length;
  } catch (error) {
    // Never let housekeeping break the caller's request.
    console.error('Release expired reservations error:', error);
    return 0;
  }
}

/**
 * Atomically move `quantity` available items to `reserved` for an order.
 * All-or-nothing: a partial claim is rolled back and reported as a failure.
 */
export async function reserveStock(
  orderId: string,
  productId: string,
  quantity: number
): Promise<{ ok: boolean; reserved: number; error?: string }> {
  try {
    // Free up anything abandoned before deciding there is no stock left.
    await releaseExpiredReservations();

    const claimed = await query<{ id: string }>(
      `UPDATE stock_items
       SET status = 'reserved', order_id = $1, updated_at = NOW()
       WHERE id IN (
         SELECT id FROM stock_items
         WHERE product_id = $2 AND status = 'available'
         ORDER BY created_at
         LIMIT $3
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id`,
      [orderId, productId, quantity]
    );

    if (claimed.length < quantity) {
      await releaseReservation(orderId);
      return {
        ok: false,
        reserved: 0,
        error: `Insufficient stock: need ${quantity}, have ${claimed.length}`,
      };
    }

    console.log(`🔒 Reserved ${claimed.length} item(s) for order ${orderId}`);
    return { ok: true, reserved: claimed.length };
  } catch (error) {
    console.error('Reserve stock error:', error);
    await releaseReservation(orderId).catch(() => {});
    return { ok: false, reserved: 0, error: getErrorMessage(error) };
  }
}

/**
 * Release every item still reserved for a given order.
 * Used when checkout aborts; leaves `sold` items untouched.
 */
export async function releaseReservation(orderId: string): Promise<number> {
  const released = await query<{ id: string }>(
    `UPDATE stock_items
     SET status = 'available', order_id = NULL, updated_at = NOW()
     WHERE order_id = $1 AND status = 'reserved'
     RETURNING id`,
    [orderId]
  );

  if (released.length > 0) {
    console.log(`🔓 Released ${released.length} item(s) from order ${orderId}`);
  }

  return released.length;
}
