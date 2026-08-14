import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The bot answers anyone who presents an order id, so the rule these tests
// guard is: never hand back more than the holder of that id already has.

const queryOne = vi.fn();
const reissueDownloadLink = vi.fn();
const rateLimit = vi.fn();

vi.mock('../lib/db', () => ({
  queryOne: (...a: unknown[]) => queryOne(...a),
  query: vi.fn(),
  execute: vi.fn(),
}));

vi.mock('../lib/delivery', () => ({
  reissueDownloadLink: (...a: unknown[]) => reissueDownloadLink(...a),
}));

vi.mock('../lib/telegram', () => ({ sendTelegramMessage: vi.fn() }));

vi.mock('../lib/rate-limit', () => ({
  rateLimit: (...a: unknown[]) => rateLimit(...a),
  getClientIp: () => 'test',
}));

const { handleCommand } = await import('../lib/telegram-bot');

const ORDER_ID = '73df9be1-9295-4372-89a1-68273dd03fc8';

const delivered = {
  id: ORDER_ID,
  status: 'delivered',
  quantity: 1,
  customer_email: 'buyer@example.com',
  created_at: '2026-08-10T10:00:00Z',
  delivered_at: '2026-08-10T10:05:00Z',
  product_name: 'Starter Threshold Account',
};

beforeEach(() => {
  queryOne.mockReset();
  reissueDownloadLink.mockReset();
  rateLimit.mockReset();
  rateLimit.mockResolvedValue({ allowed: true, remaining: 5, retryAfterSeconds: 0 });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('/order', () => {
  it('reports status without exposing the full email', async () => {
    queryOne.mockResolvedValueOnce(delivered);

    const reply = await handleCommand(`/order ${ORDER_ID}`, 1);

    expect(reply).toContain('Starter Threshold Account');
    expect(reply).toContain('Delivered');
    // The masked form may appear; the raw address must not.
    expect(reply).not.toContain('buyer@example.com');
    expect(reply).toContain('@example.com');
  });

  it('accepts a bare order id, which is what people paste', async () => {
    queryOne.mockResolvedValueOnce(delivered);

    const reply = await handleCommand(ORDER_ID, 1);

    expect(reply).toContain('Starter Threshold Account');
  });

  it('rejects anything that is not an order id without hitting the database', async () => {
    const reply = await handleCommand('/order DROP TABLE orders', 1);

    expect(queryOne).not.toHaveBeenCalled();
    expect(reply).toContain('order id');
  });

  it('says nothing revealing when the order is unknown', async () => {
    queryOne.mockResolvedValueOnce(null);

    const reply = await handleCommand(`/order ${ORDER_ID}`, 1);

    expect(reply).toContain('No order with that id');
  });

  it('handles the French alias', async () => {
    queryOne.mockResolvedValueOnce(delivered);
    expect(await handleCommand(`/commande ${ORDER_ID}`, 1)).toContain('Starter');
  });

  it('strips a bot mention from the command', async () => {
    queryOne.mockResolvedValueOnce(delivered);
    expect(await handleCommand(`/order@gads_scale_bot ${ORDER_ID}`, 1)).toContain('Starter');
  });
});

describe('/resend', () => {
  it('never returns the download link itself', async () => {
    reissueDownloadLink.mockResolvedValueOnce({ success: true, downloadToken: 'secret-token-xyz' });
    queryOne.mockResolvedValueOnce({ customer_email: 'buyer@example.com' });

    const reply = await handleCommand(`/resend ${ORDER_ID}`, 1);

    // The link goes to the registered mailbox, so asking here can't leak it.
    expect(reply).not.toContain('secret-token-xyz');
    expect(reply).toContain('on its way');
    expect(reply).not.toContain('buyer@example.com');
  });

  it('passes the delivery error straight through', async () => {
    reissueDownloadLink.mockResolvedValueOnce({
      success: false,
      error: 'Order has not been delivered yet',
    });

    const reply = await handleCommand(`/resend ${ORDER_ID}`, 1);

    expect(reply).toContain('not been delivered');
  });

  it('is rate limited before any email is sent', async () => {
    rateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterSeconds: 900 });

    const reply = await handleCommand(`/resend ${ORDER_ID}`, 1);

    expect(reissueDownloadLink).not.toHaveBeenCalled();
    expect(reply).toContain('Too many');
  });
});

describe('fallbacks', () => {
  it('greets on /start', async () => {
    expect(await handleCommand('/start', 1)).toContain('Welcome');
  });

  it('falls back to help on anything unrecognised', async () => {
    const reply = await handleCommand('hello there', 1);
    expect(reply).toContain('/order');
    expect(reply).toContain('/resend');
  });
});
