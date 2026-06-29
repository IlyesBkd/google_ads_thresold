import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/jwt';
import { query, execute } from '@/lib/db';
import { StockItemWithProduct } from '@/lib/types';
import { checkAndAlertStock } from '@/lib/stock-alerts';
import { notifyWaitlist } from '@/lib/waitlist-notify';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query with filters
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (productId) {
      conditions.push(`s.product_id = $${paramCount++}`);
      params.push(productId);
    }

    if (status) {
      conditions.push(`s.status = $${paramCount++}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);

    const items = await query<StockItemWithProduct>(
      `SELECT
         s.*,
         p.name as product_name
       FROM stock_items s
       JOIN products p ON p.id = s.product_id
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      params
    );

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error('Get inventory error:', error);
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
    // Verify authentication
    const admin = await requireAuth(request);

    const body = await request.json();
    const { productId, credentials } = body;

    if (!productId || !credentials) {
      return NextResponse.json(
        { success: false, error: 'productId and credentials are required' },
        { status: 400 }
      );
    }

    // Parse credentials. Preferred format is pipe-delimited so optional fields
    // (the proxy in particular) can themselves contain colons:
    //   email|password|totp_secret|recovery_email|proxy
    // The last three fields are optional. For backward compatibility a line
    // without a pipe is still treated as the legacy "email:password" format.
    const lines = credentials.split('\n').map((line: string) => line.trim()).filter(Boolean);

    const toImport: Array<{
      email: string;
      password: string;
      totpSecret: string | null;
      recoveryEmail: string | null;
      proxy: string | null;
    }> = [];
    const errors: string[] = [];
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;

      let email: string;
      let password: string;
      let totpSecret: string | null = null;
      let recoveryEmail: string | null = null;
      let proxy: string | null = null;

      if (line.includes('|')) {
        const parts = line.split('|').map((p: string) => p.trim());

        if (parts.length < 2) {
          errors.push(`Line ${lineNumber}: Invalid format (expected email|password|totp|recovery|proxy)`);
          continue;
        }

        email = parts[0];
        password = parts[1];
        totpSecret = parts[2] || null;
        recoveryEmail = parts[3] || null;
        proxy = parts[4] || null;
      } else {
        // Legacy "email:password" (password may contain colons)
        const idx = line.indexOf(':');

        if (idx === -1) {
          errors.push(`Line ${lineNumber}: Invalid format (expected email|password|totp|recovery|proxy)`);
          continue;
        }

        email = line.slice(0, idx).trim();
        password = line.slice(idx + 1).trim();
      }

      if (!email || !password) {
        errors.push(`Line ${lineNumber}: Email or password is empty`);
        continue;
      }

      // Basic email validation
      if (!email.includes('@')) {
        errors.push(`Line ${lineNumber}: Invalid email format`);
        continue;
      }

      toImport.push({ email, password, totpSecret, recoveryEmail, proxy });
    }

    if (toImport.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid credentials to import', errors },
        { status: 400 }
      );
    }

    // Check for duplicates in database
    const emails = toImport.map((item) => item.email);
    const existingItems = await query<{ email: string }>(
      `SELECT email FROM stock_items
       WHERE product_id = $1 AND email = ANY($2)`,
      [productId, emails]
    );

    const existingEmails = new Set(existingItems.map((item) => item.email));
    const newItems = toImport.filter((item) => !existingEmails.has(item.email));
    const duplicateCount = toImport.length - newItems.length;

    // Insert valid new items
    let addedCount = 0;
    for (const item of newItems) {
      try {
        await execute(
          `INSERT INTO stock_items (product_id, email, password, totp_secret, recovery_email, proxy, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [productId, item.email, item.password, item.totpSecret, item.recoveryEmail, item.proxy, 'available']
        );
        addedCount++;
      } catch (err) {
        errors.push(`Failed to insert ${item.email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Log the import
    await query(
      'INSERT INTO logs (type, message, admin_id) VALUES ($1, $2, $3)',
      [
        'import',
        `Imported ${addedCount} credentials for product ${productId} — ${duplicateCount} duplicates skipped`,
        admin.adminId,
      ]
    );

    // Check stock levels after import (no await - fire and forget)
    checkAndAlertStock(productId).catch((err) => console.error('Stock alert error:', err));

    // Notify the restock waitlist (email + Telegram channel). Each pending entry is
    // notified at most once, so re-importing won't re-notify already-notified users.
    if (addedCount > 0) {
      notifyWaitlist(productId).catch((err) => console.error('Waitlist notify error:', err));
    }

    return NextResponse.json({
      success: true,
      data: {
        added: addedCount,
        duplicates: duplicateCount,
        errors,
      },
    });
  } catch (error) {
    console.error('Import credentials error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Unauthorized') ? 401 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
