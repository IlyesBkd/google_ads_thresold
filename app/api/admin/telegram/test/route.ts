import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/jwt';
import { sendTelegramChannelMessage } from '@/lib/telegram';
import { getErrorMessage } from '@/lib/errors';

/**
 * POST /api/admin/telegram/test
 * Posts a test message to the configured Telegram channel.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);

    const result = await sendTelegramChannelMessage(
      '✅ <b>GadScale</b> — Telegram is connected. Restock alerts will be posted here.'
    );

    if (result.skipped) {
      return NextResponse.json(
        { success: false, error: 'Bot token or channel ID not configured' },
        { status: 400 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to post to Telegram' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, message: 'Test message posted' });
  } catch (error) {
    const status = getErrorMessage(error)?.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) || 'Telegram test failed' },
      { status }
    );
  }
}
