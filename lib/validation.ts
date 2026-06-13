import { z } from 'zod';

export const createPaymentSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
  customerEmail: z.string().email(),
  coin: z.enum(['BTC', 'ETH', 'USDT', 'btc', 'eth', 'usdttrc20']),
});

export const waitlistSchema = z
  .object({
    productId: z.string().min(1),
    telegramUsername: z
      .string()
      .min(2)
      .max(64)
      .regex(/^@?[a-zA-Z0-9_]+$/, 'Invalid Telegram username')
      .optional(),
    email: z.string().email('Invalid email address').optional(),
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
