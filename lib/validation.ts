import { z } from 'zod';

export const createPaymentSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
  customerEmail: z.string().email(),
  coin: z.enum(['BTC', 'ETH', 'USDT', 'btc', 'eth', 'usdttrc20']),
  promoCode: z.string().max(32).optional(),
  // Asked for at checkout so a buyer can be matched against the Telegram
  // channel, but optional: a required field here is friction on the one flow
  // that makes money. Blank and null both mean "not given"; anything else is
  // still format-checked.
  telegramUsername: z.preprocess(
    (v) => (v == null || (typeof v === 'string' && v.trim() === '') ? undefined : v),
    z
      .string()
      .min(2)
      .max(64)
      .regex(/^@?[a-zA-Z0-9_]+$/, 'Invalid Telegram username')
      .optional()
  ),
});

export const waitlistSchema = z
  .object({
    productId: z.string().min(1),
    // nullish, not optional: JSON clients routinely send an explicit null for
    // "not provided", and rejecting that with "Invalid email address" would be
    // both wrong and confusing.
    telegramUsername: z
      .string()
      .min(2)
      .max(64)
      .regex(/^@?[a-zA-Z0-9_]+$/, 'Invalid Telegram username')
      .nullish(),
    email: z.string().email('Invalid email address').nullish(),
  })
  .refine((d) => Boolean(d.telegramUsername) || Boolean(d.email), {
    message: 'Enter your email or a Telegram username',
  });

export const ordersByEmailSchema = z.object({
  email: z.string().email(),
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
