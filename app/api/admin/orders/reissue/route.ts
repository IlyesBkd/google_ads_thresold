import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/jwt';
import { reissueDownloadLink } from '@/lib/delivery';
import { getErrorMessage } from '@/lib/errors';

/**
 * POST /api/admin/orders/reissue
 * Sends a delivered order's customer a fresh download link.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAuth(request);
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
    }

    const result = await reissueDownloadLink(orderId, admin.adminId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: { downloadToken: result.downloadToken },
    });
  } catch (error) {
    console.error('Reissue order error:', error);

    if (getErrorMessage(error)?.includes('Unauthorized')) {
      return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 401 });
    }

    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
