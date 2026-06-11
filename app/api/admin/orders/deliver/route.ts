import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/jwt';
import { deliverOrder } from '@/lib/delivery';

/**
 * Manually deliver an order (assign credentials + send email)
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await requireAuth(request);
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const result = await deliverOrder(orderId, payload.adminId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        deliveredCount: result.deliveredCount,
        downloadToken: result.downloadToken,
      },
    });
  } catch (error: any) {
    console.error('Deliver order error:', error);

    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
