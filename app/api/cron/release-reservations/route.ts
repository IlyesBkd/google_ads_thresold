import { NextRequest, NextResponse } from 'next/server';
import { releaseExpiredReservations, getReservationTimeoutMinutes } from '@/lib/reservations';

/**
 * GET /api/cron/release-reservations
 *
 * Safety net for the lazy sweep that already runs on the stock read paths.
 * Only needed when the shop gets no traffic at all for a long stretch.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { success: false, error: 'CRON_SECRET is not configured' },
      { status: 500 }
    );
  }

  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const released = await releaseExpiredReservations();

  return NextResponse.json({
    success: true,
    data: { released, timeoutMinutes: getReservationTimeoutMinutes() },
  });
}
