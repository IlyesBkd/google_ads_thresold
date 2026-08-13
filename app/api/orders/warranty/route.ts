import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedEmail } from '@/lib/order-access';
import { fileClaim, CLAIM_REASONS, REASON_LABELS, type ClaimReason } from '@/lib/warranty';
import { notifyError, getDiscordWebhookUrl } from '@/lib/discord';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * POST /api/orders/warranty
 * A verified buyer opens a replacement claim on one of their delivered orders.
 */
export async function POST(request: NextRequest) {
  try {
    const email = await getVerifiedEmail(request);

    if (!email) {
      return NextResponse.json({ success: false, error: 'Verification required' }, { status: 401 });
    }

    const limited = await rateLimit('warranty-claim', getClientIp(request), 5, 3600);
    if (!limited.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many claims. Contact support on Telegram.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const orderId = typeof body?.orderId === 'string' ? body.orderId : '';
    const reason = body?.reason as ClaimReason;

    if (!orderId || !CLAIM_REASONS.includes(reason)) {
      return NextResponse.json(
        { success: false, error: 'Order and a valid reason are required' },
        { status: 400 }
      );
    }

    const result = await fileClaim(orderId, email, reason, body?.details);

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // A claim is a customer waiting on a human — surface it immediately.
    try {
      await notifyError(await getDiscordWebhookUrl(), {
        type: 'Warranty claim opened',
        message: REASON_LABELS[reason],
        orderId,
        details: `From ${email}${body?.details ? ` — ${String(body.details).slice(0, 400)}` : ''}`,
      });
    } catch (error) {
      console.error('Claim notification error:', error);
    }

    return NextResponse.json({
      success: true,
      data: { claimId: result.claimId },
      message: 'Claim received. We reply on Telegram, usually within a few hours.',
    });
  } catch (error) {
    console.error('Warranty claim error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
