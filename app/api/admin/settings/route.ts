import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/jwt';

/**
 * GET /api/admin/settings
 * Retrieve all settings
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    await requireAuth(request);

    // Fetch all settings
    const rows = await query<{ key: string; value: string }>('SELECT key, value FROM settings ORDER BY key', []);

    // Convert to object format
    const settings: Record<string, string> = {};
    rows.forEach((row) => {
      settings[row.key] = row.value;
    });

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    const status = error.message?.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch settings' },
      { status }
    );
  }
}

/**
 * POST /api/admin/settings
 * Save settings (bulk update)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const user = await requireAuth(request);

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid settings object' },
        { status: 400 }
      );
    }

    // Update each setting
    const updatePromises = Object.entries(settings).map(([key, value]) =>
      query(
        `INSERT INTO settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key)
         DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, String(value)]
      )
    );

    await Promise.all(updatePromises);

    // Log the action
    await query(
      `INSERT INTO logs (type, message, admin_id, created_at)
       VALUES ($1, $2, $3, NOW())`,
      ['import', `Settings updated by ${user.email}`, user.adminId]
    );

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
    });
  } catch (error: any) {
    console.error('Error saving settings:', error);
    const status = error.message?.includes('Unauthorized') ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save settings' },
      { status }
    );
  }
}
