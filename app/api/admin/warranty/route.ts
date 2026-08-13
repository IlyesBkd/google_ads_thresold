import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/jwt';
import { listClaims, resolveClaim } from '@/lib/warranty';
import { execute } from '@/lib/db';
import { getErrorMessage } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const status = new URL(request.url).searchParams.get('status') || 'open';
    const claims = await listClaims(status);

    return NextResponse.json({ success: true, data: claims });
  } catch (error) {
    const message = getErrorMessage(error) || 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAuth(request);
    const { claimId, status, resolution } = await request.json();

    if (!claimId || (status !== 'replaced' && status !== 'rejected')) {
      return NextResponse.json(
        { success: false, error: 'claimId and a status of replaced or rejected are required' },
        { status: 400 }
      );
    }

    const result = await resolveClaim(claimId, status, resolution || '');

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    await execute('INSERT INTO logs (type, message, admin_id) VALUES ($1, $2, $3)', [
      'sale',
      `Warranty claim ${claimId} marked ${status} by ${admin.email}`,
      admin.adminId,
    ]);

    return NextResponse.json({ success: true, data: { updated: true } });
  } catch (error) {
    const message = getErrorMessage(error) || 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
