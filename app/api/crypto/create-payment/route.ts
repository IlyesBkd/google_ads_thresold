import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { createPayment, simulatePaymentConfirmation } from '@/lib/nowpayments';
import { Product } from '@/lib/types';
import { createPaymentSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { productId, quantity, customerEmail, coin, promoCode } = parsed.data;

    // Get product
    const product = await queryOne<Product>(
      'SELECT * FROM products WHERE id = $1 AND active = true',
      [productId]
    );

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found or inactive' },
        { status: 404 }
      );
    }

    // Check stock availability
    const stockResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM stock_items
       WHERE product_id = $1 AND status = 'available'`,
      [productId]
    );

    const availableStock = parseInt(stockResult?.count || '0');

    if (availableStock < quantity) {
      return NextResponse.json(
        { success: false, error: `Insufficient stock: need ${quantity}, have ${availableStock}` },
        { status: 400 }
      );
    }

    // Validate promo code against env var (simple fixed code)
    let validPromoCode: string | null = null;
    if (promoCode) {
      const envPromoCode = process.env.PROMO_CODE;
      if (envPromoCode && promoCode === envPromoCode) {
        validPromoCode = promoCode;
      } else {
        return NextResponse.json({ success: false, error: 'Code promo invalide' }, { status: 400 });
      }
    }

    // Calculate amount (apply -3% discount if promo code valid)
    let totalAmount = product.price * quantity; // in cents
    if (validPromoCode) {
      totalAmount = Math.round(product.price * quantity * 0.97);
    }

    // Create order
    const orderId = crypto.randomUUID();

    await execute(
      `INSERT INTO orders (
        id, product_id, quantity, customer_email,
        amount, coin, status, promo_code, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [orderId, productId, quantity, customerEmail, totalAmount, coin, 'pending', validPromoCode]
    );

    // Create NOWPayments invoice
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookUrl = `${appUrl}/api/crypto/webhook`;

    const paymentResult = await createPayment({
      priceAmount: totalAmount / 100, // Convert cents to dollars
      priceCurrency: 'USD',
      payCurrency: coin,
      orderId,
      orderDescription: `${quantity}x ${product.name}`,
      ipnCallbackUrl: webhookUrl,
    });

    if (!paymentResult.success) {
      // Cleanup: delete order
      await execute('DELETE FROM orders WHERE id = $1', [orderId]);

      return NextResponse.json(
        { success: false, error: paymentResult.error || 'Payment creation failed' },
        { status: 500 }
      );
    }

    // Update order with payment details
    await execute(
      `UPDATE orders
       SET wallet_address = $1, updated_at = NOW()
       WHERE id = $2`,
      [paymentResult.data!.payAddress, orderId]
    );

    // Log order creation
    await execute(
      `INSERT INTO logs (type, message, order_id)
       VALUES ('sale', $1, $2)`,
      [
        `Order ${orderId} created: ${quantity}x ${product.name} ($${totalAmount / 100}) by ${customerEmail}${validPromoCode ? ` [promo: ${validPromoCode}]` : ''}`,
        orderId,
      ]
    );

    // If mock mode, simulate payment after 10 seconds
    const isMockMode =
      !process.env.CRYPTO_GATEWAY_API_KEY ||
      process.env.CRYPTO_GATEWAY_API_KEY === 'your-crypto-gateway-api-key';

    if (isMockMode) {
      // Don't await - let it run in background
      simulatePaymentConfirmation(paymentResult.data!.paymentId, orderId).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        paymentId: paymentResult.data!.paymentId,
        payAddress: paymentResult.data!.payAddress,
        payAmount: paymentResult.data!.payAmount,
        payCurrency: paymentResult.data!.payCurrency,
        priceAmount: totalAmount / 100,
        priceCurrency: 'USD',
        expiresAt: paymentResult.data!.expirationEstimateDate,
        mockMode: isMockMode,
        discount: validPromoCode ? 3 : 0,
      },
    });
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
