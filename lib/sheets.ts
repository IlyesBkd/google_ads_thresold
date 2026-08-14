/**
 * Google Sheets access via a service account.
 *
 * A user OAuth token — which is what the local Python scripts use — expires and
 * needs a browser consent to renew, so it cannot work from a serverless
 * function. A service account signs its own assertion and never expires: share
 * the spreadsheet with its email and it keeps working unattended.
 *
 * No new dependency: `jose` is already used for admin JWTs and can sign the
 * RS256 assertion Google expects, after which the REST API is plain fetch.
 */

import { importPKCS8, SignJWT } from 'jose';
import { getErrorMessage } from './errors';

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://sheets.googleapis.com/v4/spreadsheets';

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

export function getSpreadsheetId(): string | null {
  return process.env.GOOGLE_SHEETS_ID || null;
}

function getServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      client_email: parsed.client_email,
      // Env vars flatten newlines; the PEM parser needs them back.
      private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
    };
  } catch (error) {
    console.error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON:', error);
    return null;
  }
}

export function isSheetsConfigured(): boolean {
  return Boolean(getServiceAccount() && getSpreadsheetId());
}

// Tokens last an hour; re-minting one per request would be a needless round trip.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const account = getServiceAccount();
  if (!account) throw new Error('Google service account is not configured');

  const key = await importPKCS8(account.private_key, 'RS256');
  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(account.client_email)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const spreadsheetId = getSpreadsheetId();

  const response = await fetch(`${API}/${spreadsheetId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Sheets API ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

/** Tab names and sizes — also the cheapest way to prove access works. */
export async function getMetadata(): Promise<{
  title: string;
  tabs: { title: string; rows: number; columns: number }[];
}> {
  const data = await call<{
    properties: { title: string };
    sheets: {
      properties: { title: string; gridProperties: { rowCount: number; columnCount: number } };
    }[];
  }>('?fields=properties.title,sheets.properties');

  return {
    title: data.properties.title,
    tabs: data.sheets.map((s) => ({
      title: s.properties.title,
      rows: s.properties.gridProperties.rowCount,
      columns: s.properties.gridProperties.columnCount,
    })),
  };
}

export async function readRange(a1Range: string): Promise<string[][]> {
  const data = await call<{ values?: string[][] }>(`/values/${encodeURIComponent(a1Range)}`);
  return data.values || [];
}

export async function appendRows(a1Range: string, values: (string | number)[][]): Promise<void> {
  await call(
    `/values/${encodeURIComponent(a1Range)}:append` +
      '?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',
    { method: 'POST', body: JSON.stringify({ values }) }
  );
}

export async function writeRange(a1Range: string, values: (string | number)[][]): Promise<void> {
  await call(`/values/${encodeURIComponent(a1Range)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    body: JSON.stringify({ values }),
  });
}

/** Create a tab if it isn't there yet. Safe to call repeatedly. */
export async function ensureTab(title: string): Promise<void> {
  const meta = await getMetadata();
  if (meta.tabs.some((t) => t.title === title)) return;

  await call(':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
  });
}

/** One-line connectivity check for the admin panel. */
export async function testConnection(): Promise<{
  ok: boolean;
  title?: string;
  tabs?: string[];
  error?: string;
}> {
  if (!isSheetsConfigured()) {
    return {
      ok: false,
      error: 'Not configured — set GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_SHEETS_ID',
    };
  }

  try {
    const meta = await getMetadata();
    return { ok: true, title: meta.title, tabs: meta.tabs.map((t) => t.title) };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}
