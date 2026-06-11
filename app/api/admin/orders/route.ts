import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/jwt';
import { query, execute } from '@/lib/db';
import { OrderWithDetails, OrderStatus } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerEmail = searchParams.get('customerEmail');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query with filters
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      conditions.push(`o.status = $${paramCount++}`);
      params.push(status);
    }

    if (customerEmail) {
      conditions.push(`o.customer_email ILIKE $${paramCount++}`);
      params.push(`%${customerEmail}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);

    const orders = await query<OrderWithDetails>(
      `SELECT
         o.*,
         p.name as product_name
       FROM orders o
       JOIN products p ON p.id = o.product_id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      params
    );

    // For delivered orders, fetch delivered credentials
    const ordersWithCredentials = await Promise.all(
      orders.map(async (order) => {
        if (order.status === 'delivered') {
          const credentials = await query<{ email: string; password: string }>(
            `SELECT email, password
             FROM stock_items
             WHERE order_id = $1 AND status = 'sold'`,
            [order.id]
          );

          return {
            ...order,
            delivered_credentials: credentials.map(
              (cred) => `${cred.email}:${cred.password}`
            ),
          };
        }
        return order;
      })
    );

    return NextResponse.json({
      success: true,
      data: ordersWithCredentials,
    });
  } catch (error) {
    console.error('Get orders error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Unauthorized') ? 401 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const admin = await requireAuth(request);

    const body = await request.json();
    const { orderId, status, action } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: 'orderId and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses: OrderStatus[] = ['pending', 'paid', 'delivered', 'failed', 'refunded'];
    if (!validStatuses.includes(status as OrderStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Get order details
    const orderResult = await query<{ id: string; quantity: number; product_id: string; status: OrderStatus }>(
      'SELECT id, quantity, product_id, status FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderResult[0];

    // If delivering order, assign stock items
    if (action === 'deliver' && status === 'delivered' && order.status !== 'delivered') {
      // Find available stock items for this product
      const availableStock = await query<{ id: string }>(
        `SELECT id FROM stock_items
         WHERE product_id = $1 AND status = 'available'
         LIMIT $2`,
        [order.product_id, order.quantity]
      );

      if (availableStock.length < order.quantity) {
        return NextResponse.json(
          {
            success: false,
            error: `Not enough stock available. Need ${order.quantity}, have ${availableStock.length}`
          },
          { status: 400 }
        );
      }

      // Assign stock items to this order
      const stockIds = availableStock.map((item) => item.id);
      await execute(
        `UPDATE stock_items
         SET order_id = $1, status = 'sold', updated_at = NOW()
         WHERE id = ANY($2)`,
        [orderId, stockIds]
      );

      // Update order status and set delivered_at
      await execute(
        `UPDATE orders
         SET status = $1, delivered_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [status, orderId]
      );

      // Log the delivery
      await query(
        'INSERT INTO logs (type, message, admin_id, order_id) VALUES ($1, $2, $3, $4)',
        ['delivery', `Order ${orderId} delivered by ${admin.email}`, admin.adminId, orderId]
      );
    } else {
      // Simple status update
      const updateFields: string[] = ['status = $1', 'updated_at = NOW()'];
      const updateParams: any[] = [status, orderId];

      // Set paid_at if status is being set to paid
      if (status === 'paid' && order.status !== 'paid') {
        updateFields.push('paid_at = NOW()');
      }

      await execute(
        `UPDATE orders SET ${updateFields.join(', ')} WHERE id = $2`,
        updateParams
      );

      // Log the status change
      const logType = status === 'refunded' ? 'refund' : 'sale';
      await query(
        'INSERT INTO logs (type, message, admin_id, order_id) VALUES ($1, $2, $3, $4)',
        [logType, `Order ${orderId} status changed to ${status} by ${admin.email}`, admin.adminId, orderId]
      );
    }

    return NextResponse.json({
      success: true,
      data: { updated: true },
    });
  } catch (error) {
    console.error('Update order error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Unauthorized') ? 401 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
