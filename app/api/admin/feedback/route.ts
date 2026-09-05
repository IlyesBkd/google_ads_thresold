import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/jwt';
import { previewFeedbackRequests, sendFeedbackRequests } from '@/lib/feedback';
import { getErrorMessage } from '@/lib/errors';

/** GET — who would receive a feedback request. Sends nothing. */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    return NextResponse.json({ success: true, data: await previewFeedbackRequests() });
  } catch (error) {
    const message = getErrorMessage(error) || 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

/** POST — actually send. Outbound mail to customers, so owner/manager only. */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAuth(request);

    if (admin.role !== 'owner' && admin.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: owner or manager only' },
        { status: 403 }
      );
    }

    const result = await sendFeedbackRequests(undefined, admin.adminId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Feedback send error:', error);
    const message = getErrorMessage(error) || 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
