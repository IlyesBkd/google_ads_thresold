import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const revalidate = 300;

/**
 * GET /api/public/recent-sales
 *
 * Anonymised proof that the shop is alive. The same activity is already posted
 * publicly to the Telegram channel; this brings it onto the page, where the
 * hesitating visitor actually is.
 *
 * Never exposes an email, an order id, or an exact timestamp — only that a
 * sale of a given product happened, and roughly when.
 */
export async function GET() {
  try {
    const rows = await query<{
      product_name: string;
      quantity: number;
      coin: string;
      hours_ago: string;
    }>(
      `SELECT
         p.name as product_name,
         o.quantity,
         o.coin,
         EXTRACT(EPOCH FROM (NOW() - o.delivered_at)) / 3600 as hours_ago
       FROM orders o
       JOIN products p ON p.id = o.product_id
       WHERE o.status = 'delivered'
         AND o.delivered_at > NOW() - INTERVAL '30 days'
       ORDER BY o.delivered_at DESC
       LIMIT 8`
    );

    const totals = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM orders
       WHERE status = 'delivered' AND delivered_at > NOW() - INTERVAL '30 days'`
    );

    return NextResponse.json({
      success: true,
      data: {
        soldLast30Days: parseInt(totals[0]?.count || '0', 10),
        sales: rows.map((r) => ({
          productName: r.product_name,
          quantity: r.quantity,
          coin: r.coin.toUpperCase(),
          hoursAgo: Math.max(1, Math.round(parseFloat(r.hours_ago))),
        })),
      },
    });
  } catch (error) {
    console.error('Recent sales error:', error);
    // Social proof is decoration — never let it break the page.
    return NextResponse.json({
      success: true,
      data: { soldLast30Days: 0, sales: [] },
    });
  }
}
