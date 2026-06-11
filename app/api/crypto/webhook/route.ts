import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute, query } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/nowpayments';
import { deliverOrder } from '@/lib/delivery';
import { notifySale } from '@/lib/discord';
import { checkAndAlertStock } from '@/lib/stock-alerts';
import { Order } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // 1. Get payload
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    console.log('📥 Webhook received:', payload);

    // 2. Verify signature (security)
    const signature = request.headers.get('x-nowpayments-sig') || '';

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // 3. Extract data
    const {
      payment_id,
      order_id,
      payment_status,
      pay_amount,
      pay_currency,
      price_amount,
      price_currency,
    } = payload;

    if (!order_id || !payment_status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 4. Get order
    const order = await queryOne<Order>(
      'SELECT * FROM orders WHERE id = $1',
      [order_id]
    );

    if (!order) {
      console.error(`❌ Order not found: ${order_id}`);
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // 5. Check if already processed (idempotence)
    if (order.status === 'delivered' || order.status === 'paid') {
      console.log(`⚠️ Order ${order_id} already processed (status: ${order.status})`);
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // 6. Handle payment status
    console.log(`💳 Payment status: ${payment_status} for order ${order_id}`);

    if (payment_status === 'finished' || payment_status === 'confirmed') {
      // Payment confirmed! Update order and deliver

      // Update order status
      await execute(
        `UPDATE orders
         SET status = 'paid',
             paid_at = NOW(),
             tx_hash = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [payment_id, order_id]
      );

      console.log(`✅ Order ${order_id} marked as paid`);

      // Log payment
      await execute(
        `INSERT INTO logs (type, message, order_id)
         VALUES ('sale', $1, $2)`,
        [
          `Payment confirmed for ${order_id}: ${pay_amount} ${pay_currency} (tx: ${payment_id})`,
          order_id,
        ]
      );

      // Trigger automatic delivery
      console.log(`📤 Triggering automatic delivery for ${order_id}...`);

      const deliveryResult = await deliverOrder(order_id);

      if (deliveryResult.success) {
        console.log(`✅ Order ${order_id} delivered successfully`);
        console.log(`   Credentials: ${deliveryResult.deliveredCount}`);
        console.log(`   Token: ${deliveryResult.downloadToken}`);

        // Send Discord notification
        try {
          const settings = await query<{ key: string; value: string }>(
            "SELECT key, value FROM settings WHERE key = 'discord_webhook_url'",
            []
          );
          const webhookUrl = settings[0]?.value;

          if (webhookUrl) {
            const product = await queryOne<{ name: string }>(
              'SELECT name FROM products WHERE id = $1',
              [order.product_id]
            );

            await notifySale(webhookUrl, {
              orderId: order_id,
              productName: product?.name || `Product ${order.product_id}`,
              quantity: order.quantity,
              amount: order.amount,
              coin: order.coin,
              customerEmail: order.customer_email,
            });

            console.log('📢 Discord notification sent');
          }

          // Check stock levels and alert if low
          await checkAndAlertStock(order.product_id);
        } catch (error) {
          console.error('Discord notification error:', error);
          // Don't fail the webhook if Discord fails
        }
      } else {
        console.error(`❌ Delivery failed for ${order_id}: ${deliveryResult.error}`);

        // Log delivery error but don't fail webhook
        await execute(
          `INSERT INTO logs (type, message, order_id)
           VALUES ('error', $1, $2)`,
          [
            `Automatic delivery failed for ${order_id}: ${deliveryResult.error}`,
            order_id,
          ]
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Payment processed and delivery triggered',
      });
    } else if (payment_status === 'failed' || payment_status === 'expired') {
      // Payment failed

      await execute(
        `UPDATE orders
         SET status = 'failed', updated_at = NOW()
         WHERE id = $1`,
        [order_id]
      );

      await execute(
        `INSERT INTO logs (type, message, order_id)
         VALUES ('error', $1, $2)`,
        [
          `Payment ${payment_status} for ${order_id} (${payment_id})`,
          order_id,
        ]
      );

      console.log(`❌ Payment ${payment_status} for order ${order_id}`);

      return NextResponse.json({
        success: true,
        message: `Payment ${payment_status}`,
      });
    } else if (
      payment_status === 'waiting' ||
      payment_status === 'confirming' ||
      payment_status === 'sending'
    ) {
      // Payment in progress - just log it

      console.log(`⏳ Payment ${payment_status} for order ${order_id}`);

      return NextResponse.json({
        success: true,
        message: `Payment status: ${payment_status}`,
      });
    } else {
      // Unknown status - log and return success to avoid retries

      await execute(
        `INSERT INTO logs (type, message, order_id)
         VALUES ('error', $1, $2)`,
        [
          `Unknown payment status "${payment_status}" for ${order_id}`,
          order_id,
        ]
      );

      console.warn(`⚠️ Unknown payment status: ${payment_status}`);

      return NextResponse.json({
        success: true,
        message: 'Unknown status logged',
      });
    }
  } catch (error: any) {
    console.error('❌ Webhook error:', error);

    // Return 200 to avoid NOWPayments retries (already logged)
    return NextResponse.json(
      { success: false, error: 'Internal error logged' },
      { status: 200 }
    );
  }
}
