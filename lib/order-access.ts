/**
 * Customer order access.
 *
 * Looking up orders used to require nothing but the buyer's email address,
 * which also handed back a live download token — so knowing someone's email was
 * enough to steal the account they had just paid for. Access now requires a
 * six-digit code delivered to that address, exchanged for a short-lived token.
 */

import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { query, queryOne, execute } from './db';
import { getErrorMessage } from './errors';

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const SESSION_TTL = '30m';

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

function hashCode(email: string, code: string): string {
  // Salted with the email so a leaked hash can't be replayed for another buyer.
  return crypto.createHash('sha256').update(`${email.toLowerCase()}:${code}`).digest('hex');
}

/**
 * Issue a code for an address. Returns the code so the caller can email it —
 * it is never stored in clear text.
 */
export async function issueAccessCode(email: string): Promise<{ issued: boolean; code?: string }> {
  const normalized = email.toLowerCase();

  // Don't create codes for addresses that never bought anything: it turns the
  // endpoint into an email-existence oracle and wastes sends.
  const existing = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM orders WHERE customer_email = $1',
    [normalized]
  );

  if (parseInt(existing?.count || '0', 10) === 0) {
    return { issued: false };
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);

  // Retire any code still outstanding for this address.
  await execute(
    `UPDATE order_access_codes SET consumed_at = NOW()
     WHERE email = $1 AND consumed_at IS NULL`,
    [normalized]
  );

  await execute(
    `INSERT INTO order_access_codes (email, code_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [normalized, hashCode(normalized, code), expiresAt.toISOString()]
  );

  return { issued: true, code };
}

/**
 * Exchange a code for a session token scoped to that one address.
 */
export async function verifyAccessCode(
  email: string,
  code: string
): Promise<{ ok: boolean; token?: string; error?: string }> {
  const normalized = email.toLowerCase();

  try {
    const row = await queryOne<{ id: string; code_hash: string; attempts: number }>(
      `SELECT id, code_hash, attempts FROM order_access_codes
       WHERE email = $1 AND consumed_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [normalized]
    );

    if (!row) {
      return { ok: false, error: 'Code expired or not found. Request a new one.' };
    }

    if (row.attempts >= MAX_ATTEMPTS) {
      await execute('UPDATE order_access_codes SET consumed_at = NOW() WHERE id = $1', [row.id]);
      return { ok: false, error: 'Too many attempts. Request a new code.' };
    }

    const candidate = hashCode(normalized, code.trim());
    const expected = Buffer.from(row.code_hash, 'hex');
    const actual = Buffer.from(candidate, 'hex');
    const matches = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

    if (!matches) {
      await execute('UPDATE order_access_codes SET attempts = attempts + 1 WHERE id = $1', [
        row.id,
      ]);
      return { ok: false, error: 'Incorrect code.' };
    }

    await execute('UPDATE order_access_codes SET consumed_at = NOW() WHERE id = $1', [row.id]);

    const token = await new SignJWT({ email: normalized, scope: 'orders' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(SESSION_TTL)
      .sign(getSecret());

    return { ok: true, token };
  } catch (error) {
    console.error('Verify access code error:', error);
    return { ok: false, error: getErrorMessage(error) };
  }
}

/**
 * Read the caller's verified address from the session cookie or bearer token.
 * Returns null when absent or invalid — callers must treat that as a refusal.
 */
export async function getVerifiedEmail(request: Request): Promise<string | null> {
  let token: string | null = null;

  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) token = auth.slice(7);

  if (!token) {
    const cookie = request.headers.get('cookie') || '';
    const match = cookie.match(/(?:^|;\s*)order_access=([^;]+)/);
    if (match) token = decodeURIComponent(match[1]);
  }

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.scope !== 'orders' || typeof payload.email !== 'string') return null;
    return payload.email;
  } catch {
    return null;
  }
}

/** Housekeeping for expired codes; called opportunistically. */
export async function purgeExpiredCodes(): Promise<number> {
  const rows = await query<{ id: string }>(
    `DELETE FROM order_access_codes
     WHERE expires_at < NOW() - INTERVAL '1 day'
     RETURNING id`
  );
  return rows.length;
}
