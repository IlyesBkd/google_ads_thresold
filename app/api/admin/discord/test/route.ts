import { getErrorMessage } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/jwt';
import { notifyTest } from '@/lib/discord';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    await requireAuth(request);

    // Get Discord webhook URL from settings
    const settings = await query<{ key: string; value: string }>(
      "SELECT key, value FROM settings WHERE key = 'discord_webhook_url'",
      []
    );

    const webhookUrl = settings[0]?.value;

    if (!webhookUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Discord webhook URL not configured',
        },
        { status: 400 }
      );
    }

    // Send test notification
    const result = await notifyTest(webhookUrl);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send test notification',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test notification sent successfully',
    });
  } catch (error) {
    console.error('Discord test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
