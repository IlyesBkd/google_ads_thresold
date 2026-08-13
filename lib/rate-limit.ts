/**
 * Fixed-window rate limiting backed by Postgres.
 *
 * Serverless functions get recycled constantly, so an in-memory counter would
 * reset at random and protect nothing. The `rate_limits` table survives across
 * invocations and is cheap enough at this traffic level.
 */

import { queryOne } from './db';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Count one hit against `scope:identifier`.
 *
 * The whole check is a single upsert: the row is reset when its window has
 * rolled over, incremented otherwise, so concurrent requests can't both read a
 * stale count and decide they're under the limit.
 */
export async function rateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const bucket = `${scope}:${identifier}`;

  try {
    const row = await queryOne<{ hits: number; window_start: string }>(
      `INSERT INTO rate_limits (bucket, hits, window_start)
       VALUES ($1, 1, NOW())
       ON CONFLICT (bucket) DO UPDATE
         SET hits = CASE
               WHEN rate_limits.window_start < NOW() - make_interval(secs => $2::int)
               THEN 1
               ELSE rate_limits.hits + 1
             END,
             window_start = CASE
               WHEN rate_limits.window_start < NOW() - make_interval(secs => $2::int)
               THEN NOW()
               ELSE rate_limits.window_start
             END
       RETURNING hits, window_start`,
      [bucket, windowSeconds]
    );

    const hits = row?.hits ?? 1;
    const started = row ? new Date(row.window_start).getTime() : Date.now();
    const elapsed = Math.floor((Date.now() - started) / 1000);

    return {
      allowed: hits <= limit,
      remaining: Math.max(0, limit - hits),
      retryAfterSeconds: Math.max(1, windowSeconds - elapsed),
    };
  } catch (error) {
    // Fail open: a broken limiter must not take the shop down.
    console.error('Rate limit error:', error);
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }
}

/**
 * Best-effort client IP. Vercel always sets x-forwarded-for; the fallback keeps
 * local development working.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}
