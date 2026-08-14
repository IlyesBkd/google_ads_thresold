/**
 * Two-way sync between the spreadsheet and the shop.
 *
 *   Sheet → shop : an "Import" tab feeds new accounts into inventory.
 *   shop → Sheet : delivered orders land in "Sales", stock levels in "Stock".
 *
 * Everything here is best-effort: a spreadsheet being unreachable must never
 * block a sale or fail a webhook.
 */

import { query, execute } from './db';
import { getErrorMessage } from './errors';
import { appendRows, ensureTab, isSheetsConfigured, readRange, writeRange } from './sheets';
import { checkAndAlertStock } from './stock-alerts';
import { notifyWaitlist } from './waitlist-notify';

export const IMPORT_TAB = 'Import';
export const SALES_TAB = 'Sales';
export const STOCK_TAB = 'Stock';

const IMPORT_HEADER = [
  'email',
  'password',
  '2fa_secret',
  'recovery_email',
  'proxy',
  'product_id',
  'imported_at',
];

const SALES_HEADER = [
  'order_id',
  'date',
  'product',
  'quantity',
  'amount_usd',
  'coin',
  'promo',
  'customer_email',
  'status',
];

/** Create the tabs and their headers. Idempotent. */
export async function initialiseTabs(): Promise<void> {
  await ensureTab(IMPORT_TAB);
  await ensureTab(SALES_TAB);
  await ensureTab(STOCK_TAB);

  const importHead = await readRange(`${IMPORT_TAB}!A1:G1`);
  if (importHead.length === 0) await writeRange(`${IMPORT_TAB}!A1:G1`, [IMPORT_HEADER]);

  const salesHead = await readRange(`${SALES_TAB}!A1:I1`);
  if (salesHead.length === 0) await writeRange(`${SALES_TAB}!A1:I1`, [SALES_HEADER]);
}

/**
 * Sheet → shop.
 *
 * Reads rows from the Import tab and inserts the ones not yet imported. A row
 * counts as done once column G holds a timestamp, which is written back — so
 * running this twice never duplicates stock.
 */
export async function importStockFromSheet(
  adminId?: string
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  if (!isSheetsConfigured()) {
    return { imported: 0, skipped: 0, errors: ['Google Sheets is not configured'] };
  }

  const rows = await readRange(`${IMPORT_TAB}!A2:G1000`);
  if (rows.length === 0) return { imported: 0, skipped: 0, errors: [] };

  const products = await query<{ id: string }>('SELECT id FROM products');
  const validProducts = new Set(products.map((p) => p.id));

  const stamps: string[][] = [];
  const touched = new Set<string>();
  const now = new Date().toISOString();

  for (const row of rows) {
    const [email, password, totp, recovery, proxy, productId, importedAt] = row.map((c) =>
      (c || '').trim()
    );

    // Already imported, or not enough to act on.
    if (importedAt || !email || !password) {
      stamps.push([importedAt || '']);
      if (email && importedAt) skipped++;
      continue;
    }

    if (!validProducts.has(productId)) {
      errors.push(`${email}: unknown product "${productId}"`);
      stamps.push(['']);
      continue;
    }

    try {
      // The (email, product_id) uniqueness constraint makes re-runs harmless
      // even if the stamp write below never lands.
      const inserted = await query<{ id: string }>(
        `INSERT INTO stock_items (product_id, email, password, totp_secret, recovery_email, proxy)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email, product_id) DO NOTHING
         RETURNING id`,
        [productId, email, password, totp || null, recovery || null, proxy || null]
      );

      if (inserted.length > 0) {
        imported++;
        touched.add(productId);
        stamps.push([now]);
      } else {
        skipped++;
        stamps.push([`duplicate ${now}`]);
      }
    } catch (error) {
      errors.push(`${email}: ${getErrorMessage(error)}`);
      stamps.push(['']);
    }
  }

  // Mark the sheet so the next run skips what we just took.
  if (stamps.length > 0) {
    await writeRange(`${IMPORT_TAB}!G2:G${1 + stamps.length}`, stamps).catch((error) =>
      errors.push(`Could not stamp the sheet: ${getErrorMessage(error)}`)
    );
  }

  if (imported > 0) {
    await execute('INSERT INTO logs (type, message, admin_id) VALUES ($1, $2, $3)', [
      'import',
      `${imported} account(s) imported from Google Sheets`,
      adminId || null,
    ]);

    for (const productId of touched) {
      checkAndAlertStock(productId).catch(() => {});
      notifyWaitlist(productId).catch(() => {});
    }
  }

  return { imported, skipped, errors };
}

/** shop → Sheet: append one delivered order to the Sales tab. */
export async function exportSaleToSheet(sale: {
  orderId: string;
  productName: string;
  quantity: number;
  amountCents: number;
  coin: string;
  customerEmail: string;
  promoCode?: string | null;
  status: string;
}): Promise<void> {
  if (!isSheetsConfigured()) return;

  try {
    await appendRows(`${SALES_TAB}!A:I`, [
      [
        sale.orderId,
        new Date().toISOString(),
        sale.productName,
        sale.quantity,
        (sale.amountCents / 100).toFixed(2),
        sale.coin.toUpperCase(),
        sale.promoCode || '',
        sale.customerEmail,
        sale.status,
      ],
    ]);
  } catch (error) {
    // A sale must never fail because a spreadsheet was unreachable.
    console.error('Sheet sale export failed:', error);
  }
}

/** shop → Sheet: overwrite the Stock tab with current levels. */
export async function exportStockLevels(): Promise<void> {
  if (!isSheetsConfigured()) return;

  try {
    const rows = await query<{
      name: string;
      available: string;
      reserved: string;
      sold: string;
    }>(
      `SELECT p.name,
              COUNT(*) FILTER (WHERE s.status = 'available') as available,
              COUNT(*) FILTER (WHERE s.status = 'reserved')  as reserved,
              COUNT(*) FILTER (WHERE s.status = 'sold')      as sold
       FROM products p
       LEFT JOIN stock_items s ON s.product_id = p.id
       WHERE p.active = true
       GROUP BY p.name
       ORDER BY p.name`
    );

    await writeRange(`${STOCK_TAB}!A1:E${rows.length + 2}`, [
      ['product', 'available', 'reserved', 'sold', 'updated_at'],
      ...rows.map((r) => [r.name, r.available, r.reserved, r.sold, new Date().toISOString()]),
      ['', '', '', '', ''],
    ]);
  } catch (error) {
    console.error('Sheet stock export failed:', error);
  }
}
