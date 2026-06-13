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

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
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
    console.error('Telegram send error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}
