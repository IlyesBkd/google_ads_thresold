import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/jwt';
import { query } from '@/lib/db';
import { getErrorMessage } from '@/lib/errors';

/**
 * GET /api/admin/analytics?days=30
 *
 * Everything the dashboard cannot answer: how revenue moves over time, where
 * checkouts are lost, what actually sells, and how often the guarantee is used.
 * All amounts are cents; the client formats.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const raw = parseInt(new URL(request.url).searchParams.get('days') || '30', 10);
    const days = [7, 30, 90, 365].includes(raw) ? raw : 30;

    // One row per day including days with no sales, so the chart has no holes.
    const series = await query<{ day: string; revenue: string; sales: string; units: string }>(
      `SELECT
         to_char(d.day, 'YYYY-MM-DD') as day,
         COALESCE(SUM(o.amount), 0)   as revenue,
         COUNT(o.id)                  as sales,
         COALESCE(SUM(o.quantity), 0) as units
       FROM generate_series(
              CURRENT_DATE - make_interval(days => $1::int - 1),
              CURRENT_DATE,
              '1 day'
            ) AS d(day)
       LEFT JOIN orders o
         ON o.status = 'delivered'
        AND DATE(o.delivered_at) = d.day
       GROUP BY d.day
       ORDER BY d.day`,
      [days]
    );

    // Current window against the one immediately before it.
    const totals = await query<{
      revenue: string;
      sales: string;
      units: string;
      customers: string;
      prev_revenue: string;
      prev_sales: string;
    }>(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE delivered_at >= CURRENT_DATE - make_interval(days => $1::int)), 0) as revenue,
         COUNT(*)             FILTER (WHERE delivered_at >= CURRENT_DATE - make_interval(days => $1::int))    as sales,
         COALESCE(SUM(quantity) FILTER (WHERE delivered_at >= CURRENT_DATE - make_interval(days => $1::int)), 0) as units,
         COUNT(DISTINCT customer_email) FILTER (WHERE delivered_at >= CURRENT_DATE - make_interval(days => $1::int)) as customers,
         COALESCE(SUM(amount) FILTER (WHERE delivered_at >= CURRENT_DATE - make_interval(days => $1::int * 2)
                                        AND delivered_at <  CURRENT_DATE - make_interval(days => $1::int)), 0) as prev_revenue,
         COUNT(*)             FILTER (WHERE delivered_at >= CURRENT_DATE - make_interval(days => $1::int * 2)
                                        AND delivered_at <  CURRENT_DATE - make_interval(days => $1::int))    as prev_sales
       FROM orders
       WHERE status = 'delivered'`,
      [days]
    );

    // Where checkouts end up. Counted on creation date, not delivery, so the
    // funnel measures intent rather than fulfilment.
    const funnel = await query<{
      started: string;
      paid: string;
      delivered: string;
      abandoned: string;
    }>(
      `SELECT
         COUNT(*)                                           as started,
         COUNT(*) FILTER (WHERE paid_at IS NOT NULL)        as paid,
         COUNT(*) FILTER (WHERE status = 'delivered')       as delivered,
         COUNT(*) FILTER (WHERE status = 'failed'
                            AND paid_at IS NULL)            as abandoned
       FROM orders
       WHERE created_at >= CURRENT_DATE - make_interval(days => $1::int)`,
      [days]
    );

    const byProduct = await query<{
      name: string;
      revenue: string;
      sales: string;
      units: string;
    }>(
      `SELECT p.name,
              COALESCE(SUM(o.amount), 0)   as revenue,
              COUNT(o.id)                  as sales,
              COALESCE(SUM(o.quantity), 0) as units
       FROM products p
       LEFT JOIN orders o
         ON o.product_id = p.id
        AND o.status = 'delivered'
        AND o.delivered_at >= CURRENT_DATE - make_interval(days => $1::int)
       GROUP BY p.name
       ORDER BY revenue DESC`,
      [days]
    );

    const byCoin = await query<{ coin: string; revenue: string; sales: string }>(
      `SELECT UPPER(coin) as coin,
              COALESCE(SUM(amount), 0) as revenue,
              COUNT(*) as sales
       FROM orders
       WHERE status = 'delivered'
         AND delivered_at >= CURRENT_DATE - make_interval(days => $1::int)
       GROUP BY UPPER(coin)
       ORDER BY revenue DESC`,
      [days]
    );

    const byCountry = await query<{ country: string; revenue: string; sales: string }>(
      `SELECT COALESCE(country, '??') as country,
              COALESCE(SUM(amount), 0) as revenue,
              COUNT(*) as sales
       FROM orders
       WHERE status = 'delivered'
         AND delivered_at >= CURRENT_DATE - make_interval(days => $1::int)
       GROUP BY COALESCE(country, '??')
       ORDER BY revenue DESC`,
      [days]
    );

    const promo = await query<{ with_promo: string; without_promo: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE promo_code IS NOT NULL) as with_promo,
         COUNT(*) FILTER (WHERE promo_code IS NULL)     as without_promo
       FROM orders
       WHERE status = 'delivered'
         AND delivered_at >= CURRENT_DATE - make_interval(days => $1::int)`,
      [days]
    );

    // Guarantee pressure. The table may not exist on an un-migrated database,
    // so a failure here degrades to zeros rather than breaking the page.
    let claims = { total: 0, open: 0 };
    try {
      const rows = await query<{ total: string; open: string }>(
        `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'open') as open
         FROM warranty_claims
         WHERE created_at >= CURRENT_DATE - make_interval(days => $1::int)`,
        [days]
      );
      claims = {
        total: parseInt(rows[0]?.total || '0', 10),
        open: parseInt(rows[0]?.open || '0', 10),
      };
    } catch {
      // warranty_claims not migrated yet
    }

    // How long a paid order waits before its credentials go out.
    const delivery = await query<{ median_seconds: string | null }>(
      `SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
                ORDER BY EXTRACT(EPOCH FROM (delivered_at - paid_at))
              ) as median_seconds
       FROM orders
       WHERE status = 'delivered'
         AND paid_at IS NOT NULL
         AND delivered_at >= CURRENT_DATE - make_interval(days => $1::int)`,
      [days]
    );

    const n = (v: string | null | undefined) => parseInt(v || '0', 10);
    const t = totals[0];
    const f = funnel[0];

    return NextResponse.json({
      success: true,
      data: {
        days,
        series: series.map((r) => ({
          day: r.day,
          revenue: n(r.revenue),
          sales: n(r.sales),
          units: n(r.units),
        })),
        totals: {
          revenue: n(t?.revenue),
          sales: n(t?.sales),
          units: n(t?.units),
          customers: n(t?.customers),
          averageOrder: n(t?.sales) > 0 ? Math.round(n(t?.revenue) / n(t?.sales)) : 0,
          prevRevenue: n(t?.prev_revenue),
          prevSales: n(t?.prev_sales),
        },
        funnel: {
          started: n(f?.started),
          paid: n(f?.paid),
          delivered: n(f?.delivered),
          abandoned: n(f?.abandoned),
        },
        byProduct: byProduct.map((r) => ({
          name: r.name,
          revenue: n(r.revenue),
          sales: n(r.sales),
          units: n(r.units),
        })),
        byCoin: byCoin.map((r) => ({ coin: r.coin, revenue: n(r.revenue), sales: n(r.sales) })),
        byCountry: byCountry.map((r) => ({
          country: r.country,
          revenue: n(r.revenue),
          sales: n(r.sales),
        })),
        promo: {
          withPromo: n(promo[0]?.with_promo),
          withoutPromo: n(promo[0]?.without_promo),
        },
        claims,
        medianDeliverySeconds: delivery[0]?.median_seconds
          ? Math.round(parseFloat(delivery[0].median_seconds))
          : null,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    const message = getErrorMessage(error) || 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
