import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The money path: a paid order must end up either fully delivered or fully
// rolled back. A partial claim would take accounts out of stock without
// anyone receiving them.

const query = vi.fn();
const queryOne = vi.fn();
const execute = vi.fn();
const sendCredentialsEmail = vi.fn();

vi.mock('../lib/db', () => ({
  query: (...a: unknown[]) => query(...a),
  queryOne: (...a: unknown[]) => queryOne(...a),
  execute: (...a: unknown[]) => execute(...a),
}));

vi.mock('../lib/email', () => ({
  sendCredentialsEmail: (...a: unknown[]) => sendCredentialsEmail(...a),
}));

const { deliverOrder, reissueDownloadLink } = await import('../lib/delivery');

const paidOrder = (overrides = {}) => ({
  id: 'order-1',
  product_id: 'starter',
  quantity: 2,
  customer_email: 'buyer@example.com',
  status: 'paid',
  product_name: 'Starter Threshold Account',
  ...overrides,
});

const stock = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `stock-${i}` }));

const sqlOf = (call: unknown[]) => String(call[0]).replace(/\s+/g, ' ');

beforeEach(() => {
  query.mockReset();
  queryOne.mockReset();
  execute.mockReset();
  sendCredentialsEmail.mockReset();
  execute.mockResolvedValue(1);
  sendCredentialsEmail.mockResolvedValue({ success: true });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('deliverOrder', () => {
  it('refuses an order that was never paid', async () => {
    queryOne.mockResolvedValueOnce(paidOrder({ status: 'pending' }));

    const result = await deliverOrder('order-1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('must be paid');
    expect(query).not.toHaveBeenCalled(); // no stock touched
  });

  it('refuses to deliver twice', async () => {
    queryOne.mockResolvedValueOnce(paidOrder({ status: 'delivered' }));

    const result = await deliverOrder('order-1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('already delivered');
  });

  it("converts the order's own reservation into a sale", async () => {
    queryOne.mockResolvedValueOnce(paidOrder());
    query.mockResolvedValueOnce(stock(2)); // reserved items claimed

    const result = await deliverOrder('order-1');

    expect(result.success).toBe(true);
    expect(result.deliveredCount).toBe(2);
    expect(sqlOf(query.mock.calls[0])).toContain("status = 'reserved'");
    expect(sendCredentialsEmail).toHaveBeenCalledOnce();
  });

  it('tops up from free stock when the reservation is short', async () => {
    queryOne.mockResolvedValueOnce(paidOrder());
    query
      .mockResolvedValueOnce(stock(1)) // only one was reserved
      .mockResolvedValueOnce(stock(1)); // one more taken from available

    const result = await deliverOrder('order-1');

    expect(result.success).toBe(true);
    expect(result.deliveredCount).toBe(2);
    // The top-up must only ask for the shortfall, not the whole quantity.
    expect(query.mock.calls[1][1]).toEqual(['order-1', 'starter', 1]);
  });

  it('rolls the whole claim back when stock runs out', async () => {
    queryOne.mockResolvedValueOnce(paidOrder());
    query
      .mockResolvedValueOnce(stock(1)) // reserved
      .mockResolvedValueOnce([]); // nothing left to top up with

    const result = await deliverOrder('order-1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('need 2, have 1');

    // The single claimed item must go back, and no email may go out.
    const rollback = execute.mock.calls.map((c) => sqlOf(c)).find((s) => s.includes("'available'"));
    expect(rollback).toBeDefined();
    expect(sendCredentialsEmail).not.toHaveBeenCalled();
  });

  it('still delivers when the email fails, and logs it', async () => {
    queryOne.mockResolvedValueOnce(paidOrder());
    query.mockResolvedValueOnce(stock(2));
    sendCredentialsEmail.mockResolvedValueOnce({ success: false, error: 'smtp down' });

    const result = await deliverOrder('order-1');

    // The customer owns the accounts either way — the link can be re-sent.
    expect(result.success).toBe(true);
    const logged = execute.mock.calls.map((c) => String(c[1])).join(' ');
    expect(logged).toContain('smtp down');
  });
});

describe('reissueDownloadLink', () => {
  it('refuses an order that was never delivered', async () => {
    queryOne.mockResolvedValueOnce(paidOrder({ status: 'paid' }));

    const result = await reissueDownloadLink('order-1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('not been delivered');
  });

  it('issues a fresh token without touching stock', async () => {
    queryOne.mockResolvedValueOnce(paidOrder({ status: 'delivered' }));
    query.mockResolvedValueOnce(stock(2)); // credentials already assigned

    const result = await reissueDownloadLink('order-1');

    expect(result.success).toBe(true);
    expect(result.downloadToken).toMatch(/^[a-f0-9]{64}$/);
    expect(sendCredentialsEmail).toHaveBeenCalledOnce();

    // Nothing may move an item's status on a re-send.
    const mutations = execute.mock.calls.map((c) => sqlOf(c));
    expect(mutations.some((s) => s.includes('UPDATE stock_items'))).toBe(false);
  });

  it('refuses when no credentials are attached', async () => {
    queryOne.mockResolvedValueOnce(paidOrder({ status: 'delivered' }));
    query.mockResolvedValueOnce([]);

    const result = await reissueDownloadLink('order-1');

    expect(result.success).toBe(false);
    expect(sendCredentialsEmail).not.toHaveBeenCalled();
  });
});
