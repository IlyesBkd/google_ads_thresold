import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/jwt';
import { testConnection } from '@/lib/sheets';
import { initialiseTabs, importStockFromSheet, exportStockLevels } from '@/lib/sheets-sync';
import { getErrorMessage } from '@/lib/errors';

/** GET — connection status, tab list. */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    return NextResponse.json({ success: true, data: await testConnection() });
  } catch (error) {
    const message = getErrorMessage(error) || 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

/** POST — run one of the sync actions. */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAuth(request);

    if (admin.role !== 'owner' && admin.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: owner or manager only' },
        { status: 403 }
      );
    }

    const { action } = await request.json();

    switch (action) {
      case 'init':
        await initialiseTabs();
        return NextResponse.json({
          success: true,
          message: 'Import, Sales and Stock tabs are ready',
        });

      case 'import': {
        const result = await importStockFromSheet(admin.adminId);
        return NextResponse.json({ success: true, data: result });
      }

      case 'export':
        await exportStockLevels();
        return NextResponse.json({ success: true, message: 'Stock levels written to the sheet' });

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action — expected init, import or export' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Sheets action error:', error);
    const message = getErrorMessage(error) || 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
