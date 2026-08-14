import { NextRequest, NextResponse } from 'next/server';
import { handleUpdate } from '@/lib/telegram-bot';

/**
 * POST /api/telegram/webhook
 * Receives updates for the customer self-service bot.
 */
export async function POST(request: NextRequest) {
  // Telegram echoes back the secret set with setWebhook. Without it, anyone who
  // guessed this URL could impersonate Telegram and drive the bot.
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!expected) {
    console.error('TELEGRAM_WEBHOOK_SECRET is not set — refusing updates');
    return NextResponse.json({ ok: true });
  }

  if (request.headers.get('x-telegram-bot-api-secret-token') !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const update = await request.json();
    await handleUpdate(update);
  } catch (error) {
    console.error('Telegram webhook error:', error);
  }

  // Always 200: a non-200 makes Telegram retry the same update indefinitely.
  return NextResponse.json({ ok: true });
}
