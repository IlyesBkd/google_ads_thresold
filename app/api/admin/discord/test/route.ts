import { getErrorMessage } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/jwt';
import { notifyTest, getDiscordWebhookUrl } from '@/lib/discord';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    await requireAuth(request);

    // Same resolution as sale notifications, so this really tests what is used
    const webhookUrl = await getDiscordWebhookUrl();

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
