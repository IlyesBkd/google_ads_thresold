import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/nowpayments';
import { deliverOrder } from '@/lib/delivery';
import { notifySale, notifyError, getDiscordWebhookUrl } from '@/lib/discord';
import {
  notifyTelegramSale,
  notifyTelegramSalePublic,
  notifyTelegramOpsSale,
} from '@/lib/telegram';
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
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
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
    const order = await queryOne<Order>('SELECT * FROM orders WHERE id = $1', [order_id]);

    if (!order) {
      console.error(`❌ Order not found: ${order_id}`);
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // 5. Check if already processed (idempotence). A `paid` order is NOT
    //    short-circuited: its delivery may have failed, and this webhook is the
    //    only thing that retries it.
    if (order.status === 'delivered') {
      console.log(`⚠️ Order ${order_id} already processed (status: ${order.status})`);
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // Payment already recorded — replay delivery only, never the announcements.
    const alreadyPaid = order.status === 'paid';

    // 6. Handle payment status
    console.log(`💳 Payment status: ${payment_status} for order ${order_id}`);

    if (
      payment_status === 'finished' ||
      payment_status === 'confirmed' ||
      payment_status === 'sending'
    ) {
      // Payment confirmed! Update order and deliver

      if (!alreadyPaid) {
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
      } else {
        console.log(`🔁 Order ${order_id} already paid — retrying delivery only`);
      }

      // Announce the sale as soon as payment is confirmed. This runs before
      // delivery so a paid order still gets reported when delivery fails.
      // Guarded by the pending → paid transition so a retry never re-announces.
      if (!alreadyPaid) {
        try {
          const product = await queryOne<{ name: string }>(
            'SELECT name FROM products WHERE id = $1',
            [order.product_id]
          );

          await notifySale(await getDiscordWebhookUrl(), {
            orderId: order_id,
            productName: product?.name || `Product ${order.product_id}`,
            quantity: order.quantity,
            amount: order.amount,
            coin: order.coin,
            customerEmail: order.customer_email,
          });

          await notifyTelegramSale({
            orderId: order_id,
            productName: product?.name || `Product ${order.product_id}`,
            quantity: order.quantity,
            amount: order.amount,
            coin: order.coin,
            customerEmail: order.customer_email,
            promoCode: order.promo_code,
          });

          console.log('📢 Telegram sale notification sent');

          await notifyTelegramSalePublic({
            productName: product?.name || `Product ${order.product_id}`,
            quantity: order.quantity,
            coin: order.coin,
          });

          console.log('📢 Telegram channel sale post sent');

          console.log('📢 Discord sale notification sent');
        } catch (error) {
          console.error('Discord notification error:', error);
          // Don't fail the webhook if Discord fails
        }
      }

      // Trigger automatic delivery
      console.log(`📤 Triggering automatic delivery for ${order_id}...`);

      const deliveryResult = await deliverOrder(order_id);

      if (deliveryResult.success) {
        console.log(`✅ Order ${order_id} delivered successfully`);
        console.log(`   Credentials: ${deliveryResult.deliveredCount}`);
        console.log(`   Token: ${deliveryResult.downloadToken}`);

        // Check stock levels and alert if low
        try {
          await checkAndAlertStock(order.product_id);
        } catch (error) {
          console.error('Stock alert error:', error);
        }
      } else {
        console.error(`❌ Delivery failed for ${order_id}: ${deliveryResult.error}`);

        // Log delivery error but don't fail webhook
        await execute(
          `INSERT INTO logs (type, message, order_id)
           VALUES ('error', $1, $2)`,
          [`Automatic delivery failed for ${order_id}: ${deliveryResult.error}`, order_id]
        );

        // The customer has paid and received nothing — this needs a human.
        try {
          await notifyError(await getDiscordWebhookUrl(), {
            type: 'Delivery failed — customer paid',
            message: `Order is paid but undelivered: ${deliveryResult.error}`,
            orderId: order_id,
            details: `Customer: ${order.customer_email} — ${order.quantity}x product ${order.product_id}`,
          });
        } catch (error) {
          console.error('Delivery alert error:', error);
        }
      }

      // Ops notification last: stock is read after delivery, so the counts it
      // reports are the position left behind by this sale.
      try {
        const opsProduct = await queryOne<{ name: string }>(
          'SELECT name FROM products WHERE id = $1',
          [order.product_id]
        );

        await notifyTelegramOpsSale({
          orderId: order_id,
          productId: order.product_id,
          productName: opsProduct?.name || `Product ${order.product_id}`,
          quantity: order.quantity,
          amount: order.amount,
          coin: order.coin,
          customerEmail: order.customer_email,
          promoCode: order.promo_code,
          delivered: deliveryResult.success,
        });
      } catch (error) {
        console.error('Telegram ops notification error:', error);
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
        [`Payment ${payment_status} for ${order_id} (${payment_id})`, order_id]
      );

      console.log(`❌ Payment ${payment_status} for order ${order_id}`);

      return NextResponse.json({
        success: true,
        message: `Payment ${payment_status}`,
      });
    } else if (
      payment_status === 'waiting' ||
      payment_status === 'confirming' ||
      payment_status === 'partially_paid'
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
        [`Unknown payment status "${payment_status}" for ${order_id}`, order_id]
      );

      console.warn(`⚠️ Unknown payment status: ${payment_status}`);

      return NextResponse.json({
        success: true,
        message: 'Unknown status logged',
      });
    }
  } catch (error) {
    console.error('❌ Webhook error:', error);

    // Return 200 to avoid NOWPayments retries (already logged)
    return NextResponse.json({ success: false, error: 'Internal error logged' }, { status: 200 });
  }
}
