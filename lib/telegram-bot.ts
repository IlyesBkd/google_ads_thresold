/**
 * Customer self-service bot (@gads_scale_bot).
 *
 * Answers the two questions that make up almost all first-line support:
 * "where is my order" and "I lost my download link". Runs on its own token,
 * separate from the ops bot that reports sales.
 *
 * Security note: an order id is the only thing a caller presents, so nothing
 * here may reveal information the holder of that id shouldn't already have.
 * Status replies carry no email address, and a re-sent link goes to the
 * order's registered address — never to whoever asked.
 */

import { queryOne } from './db';
import { reissueDownloadLink } from './delivery';
import { sendTelegramMessage } from './telegram';
import { rateLimit } from './rate-limit';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getCustomerBotToken(): string | null {
  return process.env.TELEGRAM_CUSTOMER_BOT_TOKEN || null;
}

/** Hide all but the first character and the domain: a@…@gmail.com. */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(2, local.length - 1))}@${domain}`;
}

const HELP = [
  '<b>GADSCALE — self service</b>',
  '',
  'Send me one of these:',
  '',
  '<code>/order &lt;order id&gt;</code> — where your order stands',
  '<code>/resend &lt;order id&gt;</code> — email a fresh download link',
  '<code>/help</code> — this message',
  '',
  'Your order id is at the top of your credentials file and in every email we send.',
  '',
  'Anything else, a human answers at @googleads_now.',
].join('\n');

const STATUS_TEXT: Record<string, string> = {
  pending: '⏳ Waiting for your payment to confirm on the blockchain.',
  paid: '💳 Payment confirmed. Delivery is being prepared.',
  delivered: '✅ Delivered.',
  failed: '❌ This order did not complete. No payment was taken.',
  refunded: '↩️ Refunded.',
};

async function orderStatus(orderId: string): Promise<string> {
  const order = await queryOne<{
    id: string;
    status: string;
    quantity: number;
    customer_email: string;
    created_at: string;
    delivered_at: string | null;
    product_name: string;
  }>(
    `SELECT o.id, o.status, o.quantity, o.customer_email, o.created_at, o.delivered_at,
            p.name as product_name
     FROM orders o JOIN products p ON p.id = o.product_id
     WHERE o.id = $1`,
    [orderId]
  );

  if (!order) {
    return '🔍 No order with that id. Check it against your credentials file, or ask @googleads_now.';
  }

  const lines = [
    `<b>${order.product_name}</b> ×${order.quantity}`,
    `<code>${order.id}</code>`,
    '',
    STATUS_TEXT[order.status] || order.status,
    '',
    `Ordered ${new Date(order.created_at).toLocaleDateString('en-GB')}`,
  ];

  if (order.delivered_at) {
    lines.push(`Delivered ${new Date(order.delivered_at).toLocaleDateString('en-GB')}`);
    lines.push('', `Sent to ${maskEmail(order.customer_email)}`);
    lines.push(`Use <code>/resend ${order.id}</code> for a new download link.`);
  }

  return lines.join('\n');
}

async function resend(orderId: string, chatId: number): Promise<string> {
  // Tighter than the read path: this one sends mail.
  const limited = await rateLimit('tg-resend', String(chatId), 3, 3600);
  if (!limited.allowed) {
    return '🚦 Too many re-sends. Try again later, or ask @googleads_now.';
  }

  const result = await reissueDownloadLink(orderId);

  if (!result.success) {
    return `⚠️ ${result.error || 'Could not re-send that one.'}`;
  }

  const order = await queryOne<{ customer_email: string }>(
    'SELECT customer_email FROM orders WHERE id = $1',
    [orderId]
  );

  // The link itself is never shown here — it goes to the registered address,
  // so asking on Telegram cannot hand credentials to a stranger.
  return [
    '📧 A fresh download link is on its way to',
    `<b>${order ? maskEmail(order.customer_email) : 'the order address'}</b>.`,
    '',
    'It is valid for 24 hours and works three times.',
  ].join('\n');
}

/** Turn one incoming message into a reply. */
export async function handleCommand(text: string, chatId: number): Promise<string> {
  const trimmed = text.trim();
  const [rawCommand, ...rest] = trimmed.split(/\s+/);
  const command = rawCommand.toLowerCase().split('@')[0];
  const argument = rest.join(' ').trim();

  switch (command) {
    case '/start':
      return [
        '👋 <b>Welcome to GADSCALE self service.</b>',
        '',
        'I can check an order and re-send a download link, any time of day.',
        '',
        HELP,
      ].join('\n');

    case '/help':
      return HELP;

    case '/order':
    case '/commande':
      if (!UUID.test(argument)) {
        return 'Send it with your order id, like:\n<code>/order 73df9be1-9295-4372-89a1-68273dd03fc8</code>';
      }
      return orderStatus(argument);

    case '/resend':
    case '/renvoyer':
      if (!UUID.test(argument)) {
        return 'Send it with your order id, like:\n<code>/resend 73df9be1-9295-4372-89a1-68273dd03fc8</code>';
      }
      return resend(argument, chatId);

    default:
      // A bare order id is what people actually paste.
      if (UUID.test(trimmed)) return orderStatus(trimmed);
      return HELP;
  }
}

/** Process one Telegram update. Never throws — Telegram retries on failure. */
export async function handleUpdate(update: {
  message?: { chat?: { id?: number }; text?: string };
}): Promise<void> {
  const token = getCustomerBotToken();
  const chatId = update.message?.chat?.id;
  const text = update.message?.text;

  if (!token || !chatId || !text) return;

  try {
    const limited = await rateLimit('tg-msg', String(chatId), 20, 300);
    if (!limited.allowed) {
      await sendTelegramMessage(token, String(chatId), '🚦 Slow down a moment.');
      return;
    }

    const reply = await handleCommand(text, chatId);
    await sendTelegramMessage(token, String(chatId), reply);
  } catch (error) {
    console.error('Telegram bot error:', error);
    await sendTelegramMessage(
      token,
      String(chatId),
      '⚠️ Something broke on our side. @googleads_now can help.'
    ).catch(() => {});
  }
}
