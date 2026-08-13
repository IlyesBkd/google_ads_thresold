import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessCode } from '@/lib/order-access';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { ordersByEmailSchema } from '@/lib/validation';

/**
 * POST /api/orders/verify-code
 * Trades a valid code for a 30-minute session cookie scoped to that address.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ordersByEmailSchema.safeParse({ email: body?.email });
    const code = typeof body?.code === 'string' ? body.code.trim() : '';

    if (!parsed.success || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: 'Valid email and 6-digit code are required' },
        { status: 400 }
      );
    }

    const limited = await rateLimit('order-verify', getClientIp(request), 20, 900);
    if (!limited.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
      );
    }

    const result = await verifyAccessCode(parsed.data.email, code);

    if (!result.ok || !result.token) {
      return NextResponse.json(
        { success: false, error: result.error || 'Invalid code' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true, data: { verified: true } });

    response.cookies.set('order_access', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Verify access code error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
