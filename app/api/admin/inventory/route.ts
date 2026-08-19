import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/jwt';
import { query, execute } from '@/lib/db';
import { StockItemWithProduct } from '@/lib/types';
import { checkAndAlertStock } from '@/lib/stock-alerts';
import { notifyWaitlist } from '@/lib/waitlist-notify';
import { notifyTelegramRestock } from '@/lib/telegram';

/**
 * Cookies are arbitrary JSON that can contain the pipe delimiter, so the import
 * format base64-encodes them with a `base64:` prefix. This decodes that prefix
 * when present and leaves anything else untouched.
 */
function decodeOptionalField(value: string | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('base64:')) {
    try {
      return Buffer.from(value.slice('base64:'.length), 'base64').toString('utf-8');
    } catch {
      return value;
    }
  }
  return value;
}

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

    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const admin = await requireAuth(request);

    const body = await request.json();
    const { productId, credentials, googleAdsCreatedAt } = body;

    if (!productId || !credentials) {
      return NextResponse.json(
        { success: false, error: 'productId and credentials are required' },
        { status: 400 }
      );
    }

    // Parse credentials. Preferred format is pipe-delimited so optional fields
    // (the proxy in particular) can themselves contain colons:
    //   email|password|totp_secret|recovery_email|proxy
    // Parse credentials. Preferred format is pipe-delimited so optional fields
    // (the proxy in particular) can themselves contain colons:
    //   email|password|totp_secret|recovery_email|recovery_password|proxy|cookies|backup_codes|seed_phrase|phone_number|user_agent
    // Everything after the proxy is optional. For backward compatibility a line
    // without a pipe is still treated as the legacy "email:password" format.
    const lines = credentials.split('\n').map((line: string) => line.trim()).filter(Boolean);

    const toImport: Array<{
      email: string;
      password: string;
      totpSecret: string | null;
      recoveryEmail: string | null;
      recoveryPassword: string | null;
      proxy: string | null;
      cookies: string | null;
      backupCodes: string | null;
      seedPhrase: string | null;
      phoneNumber: string | null;
      userAgent: string | null;
    }> = [];
    const errors: string[] = [];
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;

      let email: string;
      let password: string;
      let totpSecret: string | null = null;
      let recoveryEmail: string | null = null;
      let recoveryPassword: string | null = null;
      let proxy: string | null = null;
      let cookies: string | null = null;
      let backupCodes: string | null = null;
      let seedPhrase: string | null = null;
      let phoneNumber: string | null = null;
      let userAgent: string | null = null;

      if (line.includes('|')) {
        const parts = line.split('|').map((p: string) => p.trim());

        if (parts.length < 2) {
          errors.push(`Line ${lineNumber}: Invalid format (expected email|password|totp|recovery|proxy|...)`);
          continue;
        }

        email = parts[0];
        password = parts[1];
        totpSecret = parts[2] || null;
        recoveryEmail = parts[3] || null;
        recoveryPassword = parts[4] || null;
        proxy = parts[5] || null;
        cookies = decodeOptionalField(parts[6]);
        backupCodes = parts[7] || null;
        seedPhrase = parts[8] || null;
        phoneNumber = parts[9] || null;
        userAgent = parts[10] || null;
      } else {
        // Legacy "email:password" (password may contain colons)
        const idx = line.indexOf(':');

        if (idx === -1) {
          errors.push(
            `Line ${lineNumber}: Invalid format (expected email|password|totp|recovery|proxy)`
          );
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

      toImport.push({
        email,
        password,
        totpSecret,
        recoveryEmail,
        recoveryPassword,
        proxy,
        cookies,
        backupCodes,
        seedPhrase,
        phoneNumber,
        userAgent,
      });
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
      // Determine dates
      const createdDate = googleAdsCreatedAt || null;
      let expiresDate = null;
      if (createdDate) {
        const d = new Date(createdDate);
        d.setDate(d.getDate() + 60);
        expiresDate = d.toISOString().split('T')[0];
      }

      try {
        await execute(
          `INSERT INTO stock_items (product_id, email, password, totp_secret, recovery_email, recovery_password, proxy, cookies, backup_codes, seed_phrase, phone_number, user_agent, status, google_ads_created_at, promo_expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            productId,
            item.email,
            item.password,
            item.totpSecret,
            item.recoveryEmail,
            item.recoveryPassword,
            item.proxy,
            item.cookies,
            item.backupCodes,
            item.seedPhrase,
            item.phoneNumber,
            item.userAgent,
            'available',
            createdDate,
            expiresDate,
          ]
        );
        addedCount++;
      } catch (err) {
        errors.push(
          `Failed to insert ${item.email}: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    }

    // Log the import
    await query('INSERT INTO logs (type, message, admin_id) VALUES ($1, $2, $3)', [
      'import',
      `Imported ${addedCount} credentials for product ${productId} — ${duplicateCount} duplicates skipped`,
      admin.adminId,
    ]);

    // Check stock levels after import (no await - fire and forget)
    checkAndAlertStock(productId).catch((err) => console.error('Stock alert error:', err));

    // Notify the restock waitlist (email + Telegram channel). Each pending entry is
    // notified at most once, so re-importing won't re-notify already-notified users.
    if (addedCount > 0) {
      notifyWaitlist(productId).catch((err) => console.error('Waitlist notify error:', err));
      notifyTelegramRestock(productId, addedCount).catch((err) =>
        console.error('Telegram restock post error:', err)
      );
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

    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/**
 * PATCH — move stock items to another product.
 *
 * A threshold rises as an account builds payment history, so an account
 * imported as Starter can genuinely become a Pro one. This only re-labels the
 * inventory row; it does not touch the Google Ads account itself.
 */
export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAuth(request);

    if (admin.role !== 'owner' && admin.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only owner or manager can move stock items' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [];
    const productId: string = body.productId;

    if (ids.length === 0 || !productId) {
      return NextResponse.json(
        { success: false, error: 'Stock item ID(s) and a target productId are required' },
        { status: 400 }
      );
    }

    const target = await query<{ id: string; name: string }>(
      'SELECT id, name FROM products WHERE id = $1',
      [productId]
    );

    if (target.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Target product not found' },
        { status: 404 }
      );
    }

    // Only available items may move. A sold one belongs to a delivered order
    // and a reserved one to a checkout in progress — re-labelling either would
    // rewrite what a customer already bought.
    const moved = await query<{ id: string; product_id: string }>(
      `UPDATE stock_items
       SET product_id = $1, updated_at = NOW()
       WHERE id = ANY($2::text[])
         AND status = 'available'
         AND product_id <> $1
       RETURNING id, product_id`,
      [productId, ids]
    );

    const skipped = ids.length - moved.length;

    if (moved.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nothing moved — only available accounts not already on that product can be moved',
        },
        { status: 409 }
      );
    }

    await query('INSERT INTO logs (type, message, admin_id) VALUES ($1, $2, $3)', [
      'import',
      `${moved.length} stock item(s) moved to ${target[0].name} by ${admin.email}` +
        (skipped > 0 ? ` — ${skipped} skipped (sold, reserved, or already there)` : ''),
      admin.adminId,
    ]);

    // Both sides of the move change stock level: one gains, one loses.
    const affected = new Set<string>([productId]);
    for (const item of moved) affected.add(item.product_id);
    for (const id of affected) {
      checkAndAlertStock(id).catch((err) => console.error('Stock alert error:', err));
    }

    // A product that was out of stock is effectively a restock.
    notifyWaitlist(productId).catch((err) => console.error('Waitlist notify error:', err));
    notifyTelegramRestock(productId, moved.length).catch((err) =>
      console.error('Telegram restock post error:', err)
    );

    return NextResponse.json({
      success: true,
      data: { moved: moved.length, skipped, product: target[0].name },
    });
  } catch (error) {
    console.error('Move inventory error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Unauthorized') ? 401 : 500;

    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication and check role
    const admin = await requireAuth(request);

    if (admin.role !== 'owner' && admin.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only owner or manager can delete stock items' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Stock item ID(s) required' },
        { status: 400 }
      );
    }

    // Only available/error items can be removed. Sold and reserved items are kept
    // because delivery re-reads them when a customer reuses a download link.
    const deleted = await query<{ id: string; email: string; product_id: string }>(
      `DELETE FROM stock_items
       WHERE id = ANY($1::text[])
         AND status IN ('available', 'error')
       RETURNING id, email, product_id`,
      [ids]
    );

    const skipped = ids.length - deleted.length;

    if (deleted.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete sold or reserved accounts' },
        { status: 409 }
      );
    }

    await query('INSERT INTO logs (type, message, admin_id) VALUES ($1, $2, $3)', [
      'import',
      `${deleted.length} stock item(s) deleted by ${admin.email}${skipped > 0 ? ` — ${skipped} skipped (sold/reserved)` : ''}`,
      admin.adminId,
    ]);

    // Removing stock can drop a product below its threshold (no await - fire and forget)
    const affectedProducts = [...new Set(deleted.map((item) => item.product_id))];
    for (const productId of affectedProducts) {
      checkAndAlertStock(productId).catch((err) => console.error('Stock alert error:', err));
    }

    return NextResponse.json({
      success: true,
      data: {
        deleted: deleted.length,
        skipped,
      },
    });
  } catch (error) {
    console.error('Delete stock items error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('Unauthorized')
      ? 401
      : message.includes('Forbidden')
        ? 403
        : 500;

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
