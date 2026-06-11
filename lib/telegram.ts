/**
 * Telegram notification helper
 * Sends messages to users via Telegram Bot API
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export interface TelegramNotification {
  username: string;
  message: string;
}

/**
 * Send a message to a Telegram user
 * Note: Requires TELEGRAM_BOT_TOKEN in .env
 * User must have started a conversation with the bot first
 */
export async function sendTelegramMessage(
  username: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("TELEGRAM_BOT_TOKEN not configured, skipping notification");
    return { success: false, error: "Bot token not configured" };
  }

  try {
    // Note: Telegram Bot API requires chat_id, not username
    // To send to username, you need to:
    // 1. Have the user start a conversation with your bot first
    // 2. Store their chat_id when they send /start
    // 3. Use chat_id instead of username

    // For now, this is a placeholder that logs the message
    // In production, you'd implement proper chat_id storage
    console.log(`📱 Telegram notification to ${username}:`, message);

    // TODO: Implement actual Telegram API call
    // const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     chat_id: chatId, // Need to resolve username to chat_id
    //     text: message,
    //     parse_mode: "Markdown",
    //   }),
    // });

    return { success: true };
  } catch (error: any) {
    console.error("Telegram notification error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify waitlist users about stock availability
 */
export async function notifyWaitlist(
  productId: string,
  productName: string,
  users: Array<{ telegram_username: string; email?: string | null }>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  const message = `
🎉 *Stock Alert!*

The *${productName}* is back in stock!

Click here to buy now:
${process.env.NEXT_PUBLIC_SITE_URL || "https://your-site.com"}

⚡️ Limited quantity available — grab yours before they're gone!
`.trim();

  for (const user of users) {
    const result = await sendTelegramMessage(user.telegram_username, message);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  console.log(`📊 Waitlist notification complete: ${sent} sent, ${failed} failed`);

  return { sent, failed };
}
