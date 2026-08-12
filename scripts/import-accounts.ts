#!/usr/bin/env tsx
/**
 * CLI: Import credentials into GADSCALE inventory
 *
 * Usage:
 *   npx tsx scripts/import-accounts.ts <file.txt> <starter|pro> [--date YYYY-MM-DD] [--prod]
 *
 * File format (one per line, pipe-delimited):
 *   email|password|totp_secret|recovery_email|proxy_ip:port:user:pass
 *
 * Examples:
 *   npx tsx scripts/import-accounts.ts accounts.txt starter --date 2026-08-02
 *   npx tsx scripts/import-accounts.ts accounts.txt pro
 *
 * Env:
 *   PROD=true         → hits www.gadscale.com (default: localhost:3000)
 *   ADMIN_EMAIL       → override admin email (default: gadscale@gmail.com)
 *   ADMIN_PASSWORD    → override admin password
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Config ──────────────────────────────────────────────────────────────────

const isProd = process.argv.includes('--prod') || process.env.PROD === 'true';
const BASE_URL = isProd ? 'https://www.gadscale.com' : 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'gadscale@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!';

// Parse args
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
let dateArg = '';
const dateIdx = process.argv.indexOf('--date');
if (dateIdx !== -1 && process.argv[dateIdx + 1]) {
  dateArg = process.argv[dateIdx + 1];
}

const filePath = args[0];
const productId = args[1];

if (!filePath || !productId) {
  console.error('Usage: npx tsx scripts/import-accounts.ts <accounts.txt> <starter|pro> [--date YYYY-MM-DD] [--prod]');
  console.error('');
  console.error('File format: email|password|totp|recovery|proxy');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

let cookieJar = '';

async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Origin: BASE_URL,
    ...(options.headers as Record<string, string> || {}),
  };

  if (cookieJar) {
    headers['Cookie'] = cookieJar;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Save cookies
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const match = setCookie.match(/admin_token=[^;]+/);
    if (match) {
      cookieJar = cookieJar
        ? cookieJar.replace(/admin_token=[^;]*/, match[0])
        : match[0];
      if (!cookieJar.includes(match[0])) cookieJar += '; ' + match[0];
    }
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, error: text.slice(0, 200) };
  }
}

async function login(): Promise<boolean> {
  console.log(`🔐 Logging into ${BASE_URL} as ${ADMIN_EMAIL}...`);
  const res = await apiCall('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.success) {
    console.error(`❌ Login failed: ${res.error}`);
    return false;
  }
  console.log('✅ Logged in.');
  return true;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!(await login())) process.exit(1);

  // Read file
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);

  if (lines.length === 0) {
    console.error('❌ File is empty.');
    process.exit(1);
  }

  console.log(`📦 Importing ${lines.length} account(s) into product "${productId}"...`);

  const res = await apiCall('/api/admin/inventory', {
    method: 'POST',
    body: JSON.stringify({
      productId,
      credentials: lines.join('\n'),
      googleAdsCreatedAt: dateArg || null,
    }),
  });

  if (!res.success) {
    console.error(`❌ Import failed: ${res.error}`);
    process.exit(1);
  }

  const { added, duplicates, errors } = res.data as {
    added: number;
    duplicates: number;
    errors: string[];
  };

  console.log(`✅ Imported: ${added} | Duplicates skipped: ${duplicates} | Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach((e: string) => console.log(`  - ${e}`));
  }

  // Show stock summary
  const stockRes = await apiCall<Array<any>>(
    `/inventory?productId=${encodeURIComponent(productId)}&status=available`,
  );
  if (stockRes.success && Array.isArray(stockRes.data)) {
    console.log(`📊 Available stock for "${productId}": ${stockRes.data.length}`);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
