import { describe, it, expect } from 'vitest';
import {
  createPaymentSchema,
  waitlistSchema,
  ordersByEmailSchema,
  adminLoginSchema,
} from '../lib/validation';

describe('createPaymentSchema', () => {
  it('accepts valid payment data', () => {
    const result = createPaymentSchema.safeParse({
      productId: 'PROD-350',
      quantity: 2,
      customerEmail: 'user@example.com',
      coin: 'BTC',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = createPaymentSchema.safeParse({
      productId: 'PROD-350',
      quantity: 1,
      customerEmail: 'not-an-email',
      coin: 'BTC',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid coin', () => {
    const result = createPaymentSchema.safeParse({
      productId: 'PROD-350',
      quantity: 1,
      customerEmail: 'user@example.com',
      coin: 'DOGE',
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero quantity', () => {
    const result = createPaymentSchema.safeParse({
      productId: 'PROD-350',
      quantity: 0,
      customerEmail: 'user@example.com',
      coin: 'ETH',
    });
    expect(result.success).toBe(false);
  });

  it('rejects quantity over 100', () => {
    const result = createPaymentSchema.safeParse({
      productId: 'PROD-350',
      quantity: 101,
      customerEmail: 'user@example.com',
      coin: 'USDT',
    });
    expect(result.success).toBe(false);
  });
});

describe('waitlistSchema', () => {
  it('accepts valid waitlist data', () => {
    const result = waitlistSchema.safeParse({
      productId: 'PROD-350',
      telegramUsername: '@john_doe',
      email: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts username without @', () => {
    const result = waitlistSchema.safeParse({
      productId: 'PROD-500',
      telegramUsername: 'john_doe',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid telegram username', () => {
    const result = waitlistSchema.safeParse({
      productId: 'PROD-350',
      telegramUsername: 'invalid user!',
    });
    expect(result.success).toBe(false);
  });
});

describe('ordersByEmailSchema', () => {
  it('accepts valid email', () => {
    const result = ordersByEmailSchema.safeParse({ email: 'test@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects malformed email', () => {
    const result = ordersByEmailSchema.safeParse({ email: 'not-email' });
    expect(result.success).toBe(false);
  });

  it('rejects null', () => {
    const result = ordersByEmailSchema.safeParse({ email: null });
    expect(result.success).toBe(false);
  });
});

describe('adminLoginSchema', () => {
  it('accepts valid credentials', () => {
    const result = adminLoginSchema.safeParse({
      email: 'admin@test.com',
      password: 'secret123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty password', () => {
    const result = adminLoginSchema.safeParse({
      email: 'admin@test.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});
