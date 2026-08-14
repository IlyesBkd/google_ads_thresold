import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The suite has no database, so the db helpers are mocked and assertions are
// made on the SQL that reservations.ts issues.
const query = vi.fn();
const execute = vi.fn();

vi.mock('../lib/db', () => ({
  query: (...args: unknown[]) => query(...args),
  execute: (...args: unknown[]) => execute(...args),
}));

const {
  reserveStock,
  releaseReservation,
  releaseExpiredReservations,
  getReservationTimeoutMinutes,
} = await import('../lib/reservations');

/** Shorthand for a RETURNING result of n rows. */
const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `item-${i}` }));

/** Which SQL statements were issued, whitespace-collapsed. */
const sqlCalls = () => query.mock.calls.map((c) => String(c[0]).replace(/\s+/g, ' '));

beforeEach(() => {
  query.mockReset();
  execute.mockReset();
  execute.mockResolvedValue(1);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('getReservationTimeoutMinutes', () => {
  it('defaults to 30 minutes', () => {
    vi.stubEnv('RESERVATION_TIMEOUT_MINUTES', '');
    expect(getReservationTimeoutMinutes()).toBe(30);
  });

  it('reads the env override', () => {
    vi.stubEnv('RESERVATION_TIMEOUT_MINUTES', '5');
    expect(getReservationTimeoutMinutes()).toBe(5);
  });

  it('falls back to 30 on a nonsense value', () => {
    vi.stubEnv('RESERVATION_TIMEOUT_MINUTES', 'abc');
    expect(getReservationTimeoutMinutes()).toBe(30);
  });
});

describe('reserveStock', () => {
  it('reserves the full quantity', async () => {
    query
      .mockResolvedValueOnce([]) // sweep: released items
      .mockResolvedValueOnce([]) // sweep: expired orders
      .mockResolvedValueOnce(rows(2)); // the claim

    const result = await reserveStock('order-1', 'prod-1', 2);

    expect(result).toEqual({ ok: true, reserved: 2 });
    expect(sqlCalls().at(-1)).toContain("SET status = 'reserved'");
  });

  it('takes the soonest-expiring promo first, upload order as tie-break', async () => {
    query
      .mockResolvedValueOnce([]) // sweep: released items
      .mockResolvedValueOnce([]) // sweep: expired orders
      .mockResolvedValueOnce(rows(1)); // the claim

    await reserveStock('order-1', 'prod-1', 1);

    // The €400 promo is part of the sale, so a shorter-dated account must not
    // sit in stock while a longer-dated one ships.
    const claim = sqlCalls()[2];
    expect(claim).toContain("SET status = 'reserved'");
    expect(claim).toContain('ORDER BY promo_expires_at ASC NULLS LAST, created_at ASC');
  });

  it('rolls back entirely when stock is short', async () => {
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(rows(1)) // only 1 of the 3 requested
      .mockResolvedValueOnce(rows(1)); // the rollback release

    const result = await reserveStock('order-1', 'prod-1', 3);

    expect(result.ok).toBe(false);
    expect(result.reserved).toBe(0);
    expect(result.error).toContain('need 3, have 1');

    // The partial claim must be handed back, not left dangling.
    const rollback = sqlCalls().at(-1)!;
    expect(rollback).toContain("SET status = 'available'");
    expect(rollback).toContain("status = 'reserved'");
  });

  it('sweeps expired holds before declaring a shortage', async () => {
    query.mockResolvedValue([]);
    await reserveStock('order-1', 'prod-1', 1);

    // Sweep runs first, claim last.
    expect(sqlCalls()[0]).toContain("status = 'reserved'");
    expect(sqlCalls()[0]).toContain('make_interval');
  });

  it('releases the hold when the claim throws', async () => {
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('connection lost'))
      .mockResolvedValueOnce([]);

    vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await reserveStock('order-1', 'prod-1', 1);

    expect(result.ok).toBe(false);
    expect(sqlCalls().at(-1)).toContain("SET status = 'available'");
  });
});

describe('releaseReservation', () => {
  it('only touches reserved items of that order', async () => {
    query.mockResolvedValueOnce(rows(2));

    expect(await releaseReservation('order-1')).toBe(2);

    const sql = sqlCalls()[0];
    expect(sql).toContain('order_id = $1');
    expect(sql).toContain("status = 'reserved'");
    // `sold` items belong to a delivered order and must never be freed here.
    expect(sql).not.toContain("status = 'sold'");
  });
});

describe('releaseExpiredReservations', () => {
  it('releases stock and fails the orders past the timeout', async () => {
    vi.stubEnv('RESERVATION_TIMEOUT_MINUTES', '30');
    query
      .mockResolvedValueOnce(rows(2)) // released items
      .mockResolvedValueOnce(rows(1)); // expired orders

    expect(await releaseExpiredReservations()).toBe(2);

    const [releaseSql, releaseParams] = query.mock.calls[0];
    expect(String(releaseSql)).toContain("status = 'available'");
    expect(releaseParams).toEqual([30]);

    const failSql = String(query.mock.calls[1][0]).replace(/\s+/g, ' ');
    expect(failSql).toContain("SET status = 'failed'");
    // Only pending orders expire — a paid order must never be failed.
    expect(failSql).toContain("status = 'pending'");

    expect(execute).toHaveBeenCalledOnce(); // the audit log
  });

  it('writes no log when nothing expired', async () => {
    query.mockResolvedValue([]);

    expect(await releaseExpiredReservations()).toBe(0);
    expect(execute).not.toHaveBeenCalled();
  });

  it('swallows database errors so callers are unaffected', async () => {
    query.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(releaseExpiredReservations()).resolves.toBe(0);
  });
});
