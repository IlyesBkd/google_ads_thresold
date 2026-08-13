import { NextRequest, NextResponse } from 'next/server';
import { issueAccessCode } from '@/lib/order-access';
import { sendAccessCodeEmail } from '@/lib/email';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { ordersByEmailSchema } from '@/lib/validation';

/**
 * POST /api/orders/request-code
 * Emails a one-time code to a buyer so they can reach their orders.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ordersByEmailSchema.safeParse({ email: body?.email });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();

    // Two limits: one stops an attacker sweeping many addresses from one IP,
    // the other stops mailbox flooding of a single victim.
    const byIp = await rateLimit('order-code-ip', getClientIp(request), 10, 3600);
    const byEmail = await rateLimit('order-code-mail', email, 3, 900);

    if (!byIp.allowed || !byEmail.allowed) {
      const retry = Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds);
      return NextResponse.json(
        { success: false, error: 'Too many requests. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(retry) } }
      );
    }

    const { issued, code } = await issueAccessCode(email);

    if (issued && code) {
      await sendAccessCodeEmail(email, code);
    }

    // Same response either way: whether an address has orders is not public.
    return NextResponse.json({
      success: true,
      message: 'If this address has orders, a code is on its way.',
    });
  } catch (error) {
    console.error('Request access code error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
