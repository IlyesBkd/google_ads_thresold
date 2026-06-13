import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/public/settings
 * Public endpoint for client-side settings (no auth required)
 * Returns only safe, public settings
 */
export async function GET() {
  try {
    // Fetch only public settings
    const rows = await query<{ key: string; value: string }>(
      `SELECT key, value FROM settings
       WHERE key IN ('telegram_username', 'discord_webhook_url')`,
      []
    );

    // Convert to object
    const settings: Record<string, string> = {};
    rows.forEach((row) => {
      settings[row.key] = row.value;
    });

    // Only return telegram_username (discord webhook is not public)
    return NextResponse.json({
      success: true,
      data: {
        telegram_username: settings.telegram_username || '@Selling_GAds',
      },
    });
  } catch (error) {
    console.error('Error fetching public settings:', error);

    // Return default values on error
    return NextResponse.json({
      success: true,
      data: {
        telegram_username: '@Selling_GAds',
      },
    });
  }
}
