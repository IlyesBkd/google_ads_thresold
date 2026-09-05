/**
 * Telegram channel broadcast helper.
 *
 * Posts messages to a Telegram channel/group via a bot.
 * Configuration is read from the `settings` table (editable in the admin panel),
 * falling back to env vars TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_ID:
 *   - bot token: token from @BotFather
 *   - channel id: channel @username (public) or numeric -100... id (private).
 *                 The bot must be an admin of that channel.
 */

import { query } from './db';
import { getErrorMessage } from './errors';

async function getTelegramConfig(): Promise<{ token: string | null; channelId: string | null }> {
  let token = process.env.TELEGRAM_BOT_TOKEN || null;
  let channelId = process.env.TELEGRAM_CHANNEL_ID || null;

  try {
    const rows = await query<{ key: string; value: string }>(
      `SELECT key, value FROM settings
       WHERE key IN ('telegram_bot_token', 'telegram_channel_id')`,
      []
    );
    for (const row of rows) {
      if (row.key === 'telegram_bot_token' && row.value) token = row.value;
      if (row.key === 'telegram_channel_id' && row.value) channelId = row.value;
    }
  } catch (error) {
    console.error('Failed to read Telegram settings:', error);
  }

  return { token, channelId };
}

export async function isTelegramConfigured(): Promise<boolean> {
  const { token, channelId } = await getTelegramConfig();
  return Boolean(token && channelId);
}

export async function sendTelegramChannelMessage(
  text: string
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const { token, channelId } = await getTelegramConfig();

  if (!token || !channelId) {
    return { success: false, skipped: true, error: 'Telegram bot not configured' };
  }

  return sendTelegramMessage(token, channelId, text);
}

/**
 * Send a message to any Telegram chat via a bot.
 *
 * Retries transient network failures (e.g. ETIMEDOUT to api.telegram.org from
 * a serverless datacenter). Telegram API errors (4xx) are NOT retried — a bad
 * token or chat id won't fix itself.
 */
export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
  attempts = 3
): Promise<{ success: boolean; error?: string }> {
  let lastError: string | undefined;

  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Telegram API error:', response.status, errorText);
        return { success: false, error: `Telegram API error: ${response.status}` };
      }

      return { success: true };
    } catch (error) {
      lastError = getErrorMessage(error);
      console.error(`Telegram send error (attempt ${i + 1}/${attempts}):`, error);
      // Back off before the next attempt; skip the sleep on the last one.
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      }
    }
  }

  return { success: false, error: lastError };
}

/**
 * Notify about a new sale. Uses env vars:
 *   TELEGRAM_SALES_CHAT_ID → chat ID to DM
 * Falls back to TELEGRAM_CHANNEL_ID for channel broadcast.
 */
export async function notifyTelegramSale(details: {
  orderId: string;
  productName: string;
  quantity: number;
  amount: number; // in cents
  coin: string;
  customerEmail: string;
  promoCode?: string | null;
}): Promise<void> {
  const { token, channelId } = await getTelegramConfig();
  const salesChatId = process.env.TELEGRAM_SALES_CHAT_ID || channelId;

  if (!token || !salesChatId) {
    console.log('📵 Telegram sale notification skipped (not configured)');
    return;
  }

  const amountEur = (details.amount / 100).toFixed(2);
  const lines = [
    `🛒 <b>Nouvelle vente !</b>`,
    ``,
    `📦 <b>${details.productName}</b> ×${details.quantity}`,
    `💰 ${amountEur}€ (${details.coin.toUpperCase()})`,
    `📧 ${details.customerEmail}`,
    `🆔 <code>${details.orderId}</code>`,
  ];

  if (details.promoCode) {
    lines.push(`🎟️ Code promo: -3%`);
  }

  const text = lines.join('\n');

  console.log(`📨 Sending Telegram sale notification for ${details.orderId}...`);
  const result = await sendTelegramMessage(token, salesChatId, text);

  if (!result.success) {
    console.error('❌ Telegram sale notification failed:', result.error);
  } else {
    console.log('✅ Telegram sale notification sent');
  }
}

/**
 * Ops notification: full sale details plus the stock position left behind.
 *
 * Runs on its own bot (TELEGRAM_OPS_BOT_TOKEN / TELEGRAM_OPS_CHAT_ID) so it is
 * independent of the public @gadscale channel and its token.
 */
export async function notifyTelegramOpsSale(details: {
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  amount: number; // in cents
  coin: string;
  customerEmail: string;
  promoCode?: string | null;
  delivered: boolean;
  country?: string | null;
  telegramUsername?: string | null;
}): Promise<void> {
  const token = process.env.TELEGRAM_OPS_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_OPS_CHAT_ID;

  if (!token || !chatId) {
    console.log('📵 Telegram ops notification skipped (not configured)');
    return;
  }

  // Stock is read after delivery, so these counts already exclude this sale.
  let stockLine = '❓ Stock indisponible';
  let otherProductsLine: string | null = null;

  try {
    const counts = await query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) as count FROM stock_items
       WHERE product_id = $1 GROUP BY status`,
      [details.productId]
    );

    const by = (s: string) => parseInt(counts.find((c) => c.status === s)?.count || '0', 10);

    const available = by('available');
    const reserved = by('reserved');

    stockLine =
      `📊 Stock restant : <b>${available}</b> dispo` +
      (reserved > 0 ? ` · ${reserved} réservé${reserved > 1 ? 's' : ''}` : '');

    if (available === 0) {
      stockLine += `\n🚨 <b>RUPTURE DE STOCK</b>`;
    } else if (available <= 3) {
      stockLine += `\n⚠️ <b>Stock bas</b>`;
    }

    const others = await query<{ name: string; count: string }>(
      `SELECT p.name, COUNT(s.id) as count
       FROM products p
       LEFT JOIN stock_items s ON s.product_id = p.id AND s.status = 'available'
       WHERE p.active = true AND p.id <> $1
       GROUP BY p.name
       ORDER BY p.name`,
      [details.productId]
    );

    if (others.length > 0) {
      otherProductsLine = others.map((o) => `   • ${o.name} : ${o.count}`).join('\n');
    }
  } catch (error) {
    console.error('Ops stock lookup failed:', error);
  }

  const amountEur = (details.amount / 100).toFixed(2);
  const lines = [
    `💸 <b>VENTE — ${amountEur}€</b>`,
    ``,
    `📦 <b>${details.productName}</b> ×${details.quantity}`,
    `💰 ${amountEur}€ en ${details.coin.toUpperCase()}`,
    `📧 ${details.customerEmail}`,
    `🆔 <code>${details.orderId}</code>`,
  ];

  if (details.country) {
    const flag = /^[A-Z]{2}$/.test(details.country)
      ? String.fromCodePoint(...[...details.country].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
      : '🏳️';
    lines.push(`${flag} ${details.country}`);
  }

  if (details.telegramUsername) {
    lines.push(
      `💬 <a href="https://t.me/${details.telegramUsername}">@${details.telegramUsername}</a>`
    );
  }

  if (details.promoCode) {
    lines.push(`🎟️ Code promo <code>${details.promoCode}</code> (-3%)`);
  }

  lines.push(details.delivered ? `✅ Livrée automatiquement` : `⚠️ <b>NON LIVRÉE</b> — à traiter`);

  lines.push(``, stockLine);

  if (otherProductsLine) {
    lines.push(``, `📚 Autres produits :`, otherProductsLine);
  }

  const result = await sendTelegramMessage(token, chatId, lines.join('\n'));

  if (!result.success) {
    console.error('❌ Telegram ops notification failed:', result.error);
  } else {
    console.log('✅ Telegram ops notification sent');
  }
}

/**
 * Post a public restock announcement to the Telegram channel.
 */
export async function notifyTelegramRestock(productId: string, addedCount: number): Promise<void> {
  const { token, channelId } = await getTelegramConfig();

  if (!token || !channelId) {
    console.log('📵 Telegram restock post skipped (not configured)');
    return;
  }

  const products = await query<{ name: string; price: number }>(
    'SELECT name, price FROM products WHERE id = $1',
    [productId]
  );
  if (products.length === 0) return;
  const priceLabel = `$${(products[0].price / 100).toFixed(0)}`;
  const nameLabel = `${products[0].name}${addedCount > 1 ? 's' : ''}`;

  const text = [
    `🔥 <b>RESTOCK — ${addedCount} ${nameLabel}</b>`,
    ``,
    `💰 <b>${priceLabel}</b> · BTC / ETH / USDT`,
    `⚡ Instant automatic delivery`,
    ``,
    `👉 gadscale.com`,
  ].join('\n');

  const result = await sendTelegramMessage(token, channelId, text);
  if (!result.success) console.error('❌ Telegram restock post failed:', result.error);
  else console.log('✅ Telegram restock post sent');
}

/**
 * Post a public sale proof to the Telegram channel (no customer PII).
 */
export async function notifyTelegramSalePublic(details: {
  productName: string;
  quantity: number;
  coin: string;
}): Promise<void> {
  const { token, channelId } = await getTelegramConfig();

  if (!token || !channelId) {
    console.log('📵 Telegram channel sale post skipped (not configured)');
    return;
  }

  const text = [
    `📦 <b>New sale</b> ✓`,
    ``,
    `🛍️ <b>${details.productName}</b> ×${details.quantity}`,
    `💳 ${details.coin.toUpperCase()} payment confirmed`,
    `⚡ Instant automatic delivery`,
    ``,
    `👉 gadscale.com`,
  ].join('\n');

  const result = await sendTelegramMessage(token, channelId, text);
  if (!result.success) console.error('❌ Telegram channel sale post failed:', result.error);
  else console.log('✅ Telegram channel sale post sent');
}
