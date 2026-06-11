import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/jwt';
import { query, execute } from '@/lib/db';
import { ProductWithStock } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    await requireAuth(request);

    // Get all products with stock counts
    const products = await query<ProductWithStock>(
      `SELECT
         p.*,
         COUNT(s.id) as stock_total,
         COUNT(CASE WHEN s.status = 'available' THEN 1 END) as stock_available,
         COUNT(CASE WHEN s.status = 'sold' THEN 1 END) as stock_sold,
         COUNT(CASE WHEN s.status = 'reserved' THEN 1 END) as stock_reserved,
         COUNT(CASE WHEN s.status = 'error' THEN 1 END) as stock_error
       FROM products p
       LEFT JOIN stock_items s ON s.product_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    );

    // Convert string counts to numbers
    const productsWithNumbers = products.map((p) => ({
      ...p,
      stock_total: parseInt(String(p.stock_total)),
      stock_available: parseInt(String(p.stock_available)),
      stock_sold: parseInt(String(p.stock_sold)),
      stock_reserved: parseInt(String(p.stock_reserved)),
      stock_error: parseInt(String(p.stock_error)),
    }));

    return NextResponse.json({
      success: true,
      data: productsWithNumbers,
    });
  } catch (error) {
    console.error('Get products error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Unauthorized') ? 401 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and check role
    const admin = await requireAuth(request);

    if (admin.role !== 'owner' && admin.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only owner or manager can create products' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, price, threshold_value, category, low_stock_alert } = body;

    // Validation
    if (!name || !description || typeof price !== 'number' || typeof threshold_value !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid required fields' },
        { status: 400 }
      );
    }

    // Insert product
    const result = await query<{ id: string }>(
      `INSERT INTO products (name, description, price, threshold_value, category, low_stock_alert)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [name, description, price, threshold_value, category || 'general', low_stock_alert || 10]
    );

    const productId = result[0].id;

    // Log the action
    await query(
      'INSERT INTO logs (type, message, admin_id) VALUES ($1, $2, $3)',
      ['import', `Product "${name}" created by ${admin.email}`, admin.adminId]
    );

    return NextResponse.json({
      success: true,
      data: { id: productId },
    });
  } catch (error) {
    console.error('Create product error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication and check role
    const admin = await requireAuth(request);

    if (admin.role !== 'owner' && admin.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only owner or manager can update products' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, description, price, threshold_value, category, low_stock_alert, active } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(price);
    }
    if (threshold_value !== undefined) {
      updates.push(`threshold_value = $${paramCount++}`);
      values.push(threshold_value);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(category);
    }
    if (low_stock_alert !== undefined) {
      updates.push(`low_stock_alert = $${paramCount++}`);
      values.push(low_stock_alert);
    }
    if (active !== undefined) {
      updates.push(`active = $${paramCount++}`);
      values.push(active);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const updateQuery = `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramCount}`;
    const rowCount = await execute(updateQuery, values);

    if (rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Log the action
    await query(
      'INSERT INTO logs (type, message, admin_id) VALUES ($1, $2, $3)',
      ['import', `Product ${id} updated by ${admin.email}`, admin.adminId]
    );

    return NextResponse.json({
      success: true,
      data: { updated: true },
    });
  } catch (error) {
    console.error('Update product error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication and check role
    const admin = await requireAuth(request);

    if (admin.role !== 'owner' && admin.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only owner or manager can delete products' },
        { status: 403 }
      );
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Check if product has stock items
    const stockCount = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM stock_items WHERE product_id = $1',
      [id]
    );

    const count = parseInt(stockCount[0]?.count || '0');

    if (count > 0) {
      // Soft delete - set active to false
      const rowCount = await execute(
        'UPDATE products SET active = false, updated_at = NOW() WHERE id = $1',
        [id]
      );

      if (rowCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Product not found' },
          { status: 404 }
        );
      }

      await query(
        'INSERT INTO logs (type, message, admin_id) VALUES ($1, $2, $3)',
        ['import', `Product ${id} deactivated by ${admin.email}`, admin.adminId]
      );

      return NextResponse.json({
        success: true,
        data: { deleted: false, deactivated: true },
      });
    } else {
      // Hard delete - no stock items
      const rowCount = await execute(
        'DELETE FROM products WHERE id = $1',
        [id]
      );

      if (rowCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Product not found' },
          { status: 404 }
        );
      }

      await query(
        'INSERT INTO logs (type, message, admin_id) VALUES ($1, $2, $3)',
        ['import', `Product ${id} deleted by ${admin.email}`, admin.adminId]
      );

      return NextResponse.json({
        success: true,
        data: { deleted: true, deactivated: false },
      });
    }
  } catch (error) {
    console.error('Delete product error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
