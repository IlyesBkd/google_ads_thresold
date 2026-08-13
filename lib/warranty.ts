/**
 * 24-hour replacement guarantee.
 *
 * The window is deliberately short because every fault it covers — dead
 * credentials, an already-suspended account, a threshold that was never
 * unlocked — is visible on the buyer's first login.
 */

import { query, queryOne, execute } from './db';
import { getErrorMessage } from './errors';

export const WARRANTY_HOURS = 24;

export const CLAIM_REASONS = [
  'cannot_login',
  'already_suspended',
  'threshold_not_unlocked',
  'not_as_described',
] as const;

export type ClaimReason = (typeof CLAIM_REASONS)[number];

export const REASON_LABELS: Record<ClaimReason, string> = {
  cannot_login: 'Credentials do not work',
  already_suspended: 'Account is already suspended',
  threshold_not_unlocked: 'Billing threshold is not unlocked',
  not_as_described: 'Account does not match the description',
};

/** Hours left on an order's guarantee; 0 once it has lapsed. */
export function hoursRemaining(deliveredAt: string | Date | null): number {
  if (!deliveredAt) return 0;
  const elapsedMs = Date.now() - new Date(deliveredAt).getTime();
  const remaining = WARRANTY_HOURS - elapsedMs / 3_600_000;
  return remaining > 0 ? Math.ceil(remaining) : 0;
}

export async function fileClaim(
  orderId: string,
  email: string,
  reason: ClaimReason,
  details?: string
): Promise<{ ok: boolean; error?: string; claimId?: string }> {
  try {
    const order = await queryOne<{
      id: string;
      customer_email: string;
      status: string;
      delivered_at: string | null;
    }>('SELECT id, customer_email, status, delivered_at FROM orders WHERE id = $1', [orderId]);

    // The caller's address comes from a verified session, so a mismatch means
    // someone is claiming against an order that isn't theirs.
    if (!order || order.customer_email !== email.toLowerCase()) {
      return { ok: false, error: 'Order not found' };
    }

    if (order.status !== 'delivered') {
      return { ok: false, error: 'Only delivered orders are covered' };
    }

    if (hoursRemaining(order.delivered_at) === 0) {
      return {
        ok: false,
        error: `The ${WARRANTY_HOURS}-hour guarantee window has closed for this order`,
      };
    }

    const open = await queryOne<{ id: string }>(
      `SELECT id FROM warranty_claims WHERE order_id = $1 AND status = 'open'`,
      [orderId]
    );

    if (open) {
      return { ok: false, error: 'A claim is already open on this order' };
    }

    const created = await queryOne<{ id: string }>(
      `INSERT INTO warranty_claims (order_id, email, reason, details)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [orderId, email.toLowerCase(), reason, details?.slice(0, 2000) || null]
    );

    await execute(
      `INSERT INTO logs (type, message, order_id)
       VALUES ('sale', $1, $2)`,
      [`Warranty claim opened on ${orderId}: ${REASON_LABELS[reason]}`, orderId]
    );

    return { ok: true, claimId: created?.id };
  } catch (error) {
    console.error('File claim error:', error);
    return { ok: false, error: getErrorMessage(error) };
  }
}

export interface ClaimRow {
  id: string;
  order_id: string;
  email: string;
  reason: ClaimReason;
  details: string | null;
  status: string;
  resolution: string | null;
  created_at: string;
  product_name: string;
  quantity: number;
}

export async function listClaims(status = 'open'): Promise<ClaimRow[]> {
  return query<ClaimRow>(
    `SELECT c.*, p.name as product_name, o.quantity
     FROM warranty_claims c
     JOIN orders o ON o.id = c.order_id
     JOIN products p ON p.id = o.product_id
     WHERE c.status = $1
     ORDER BY c.created_at DESC`,
    [status]
  );
}

export async function resolveClaim(
  claimId: string,
  status: 'replaced' | 'rejected',
  resolution: string
): Promise<{ ok: boolean; error?: string }> {
  const updated = await execute(
    `UPDATE warranty_claims
     SET status = $2, resolution = $3, resolved_at = NOW()
     WHERE id = $1 AND status = 'open'`,
    [claimId, status, resolution]
  );

  if (updated === 0) {
    return { ok: false, error: 'Claim not found or already resolved' };
  }

  return { ok: true };
}
