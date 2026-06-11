import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/jwt';
import { query } from '@/lib/db';
import { DashboardStats } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    await requireAuth(request);

    // Revenue today
    const revenueToday = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM orders
       WHERE status = 'delivered'
       AND DATE(delivered_at) = CURRENT_DATE`
    );

    // Revenue this week (last 7 days)
    const revenueWeek = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM orders
       WHERE status = 'delivered'
       AND delivered_at >= CURRENT_DATE - INTERVAL '7 days'`
    );

    // Revenue this month (last 30 days)
    const revenueMonth = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM orders
       WHERE status = 'delivered'
       AND delivered_at >= CURRENT_DATE - INTERVAL '30 days'`
    );

    // Sales count (last 30 days)
    const sales30d = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM orders
       WHERE status = 'delivered'
       AND delivered_at >= CURRENT_DATE - INTERVAL '30 days'`
    );

    // Total stock available
    const totalStock = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM stock_items
       WHERE status = 'available'`
    );

    // Low stock products
    const lowStockProducts = await query<{
      product_id: string;
      product_name: string;
      remaining: string;
      alert_threshold: number;
    }>(
      `SELECT
         p.id as product_id,
         p.name as product_name,
         COUNT(s.id) as remaining,
         p.low_stock_alert as alert_threshold
       FROM products p
       LEFT JOIN stock_items s ON s.product_id = p.id AND s.status = 'available'
       WHERE p.active = true
       GROUP BY p.id, p.name, p.low_stock_alert
       HAVING COUNT(s.id) < p.low_stock_alert
       ORDER BY COUNT(s.id) ASC`
    );

    const stats: DashboardStats = {
      revenue_today: parseInt(revenueToday[0]?.total || '0'),
      revenue_week: parseInt(revenueWeek[0]?.total || '0'),
      revenue_month: parseInt(revenueMonth[0]?.total || '0'),
      sales_30d: parseInt(sales30d[0]?.count || '0'),
      total_stock: parseInt(totalStock[0]?.count || '0'),
      low_stock_products: lowStockProducts.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        remaining: parseInt(item.remaining),
        alert_threshold: item.alert_threshold,
      })),
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Unauthorized') ? 401 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
