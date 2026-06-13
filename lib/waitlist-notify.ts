/**
 * Restock notification orchestrator.
 *
 * When a product is restocked, this notifies every pending waitlist entry:
 *   - emails everyone who left an email (via Resend)
 *   - posts one broadcast to the Telegram channel (if configured)
 *   - marks the entries as notified and records the channel used
 */

import { query } from './db';
import { sendRestockEmail } from './email';
import { sendTelegramChannelMessage } from './telegram';

export interface NotifyResult {
  pending: number;
  emailed: number;
  emailFailed: number;
  telegram: 'sent' | 'skipped' | 'failed';
}

export async function notifyWaitlist(productId: string): Promise<NotifyResult> {
  const empty: NotifyResult = { pending: 0, emailed: 0, emailFailed: 0, telegram: 'skipped' };

  const products = await query<{ id: string; name: string }>(
    'SELECT id, name FROM products WHERE id = $1',
    [productId]
  );
  if (products.length === 0) return empty;
  const product = products[0];

  const entries = await query<{ id: string; email: string | null; telegram_username: string | null }>(
    `SELECT id, email, telegram_username
     FROM waitlist
     WHERE product_id = $1 AND notified = false`,
    [productId]
  );
  if (entries.length === 0) return empty;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const productUrl = `${appUrl}/#pricing`;

  // ─── Email everyone who left an email ──────────────────────────────────────
  let emailed = 0;
  let emailFailed = 0;
  const seenEmails = new Set<string>();
  for (const entry of entries) {
    if (!entry.email) continue;
    const key = entry.email.toLowerCase();
    if (seenEmails.has(key)) continue;
    seenEmails.add(key);

    const result = await sendRestockEmail(entry.email, product.name, productUrl);
    if (result.success) emailed++;
    else emailFailed++;
  }

  // ─── One Telegram channel broadcast ────────────────────────────────────────
  const tgText =
    `🔔 <b>${escapeHtml(product.name)}</b> is back in stock!\n\n` +
    `Limited quantity — grab yours now.\n` +
    `👉 ${appUrl}`;
  const tg = await sendTelegramChannelMessage(tgText);
  const telegram: NotifyResult['telegram'] = tg.success ? 'sent' : tg.skipped ? 'skipped' : 'failed';

  // ─── Mark entries notified ─────────────────────────────────────────────────
  const viaParts: string[] = [];
  if (emailed > 0) viaParts.push('email');
  if (telegram === 'sent') viaParts.push('channel');
  const via = viaParts.join('+') || 'none';

  await query(
    `UPDATE waitlist
     SET notified = true, notified_at = NOW(), notified_via = $2
     WHERE product_id = $1 AND notified = false`,
    [productId, via]
  );

  await query(
    `INSERT INTO logs (type, message) VALUES ('delivery', $1)`,
    [
      `Restock notify — ${product.name}: ${entries.length} on waitlist, ${emailed} emailed` +
        (emailFailed ? ` (${emailFailed} failed)` : '') +
        `, Telegram ${telegram}`,
    ]
  );

  return { pending: entries.length, emailed, emailFailed, telegram };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
