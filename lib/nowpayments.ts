/**
 * NOWPayments API integration (with mock mode for development)
 */

import { getLiveCryptoRates } from './crypto-rates';

const NOWPAYMENTS_API_KEY = process.env.CRYPTO_GATEWAY_API_KEY;
const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1';
const USE_MOCK = !NOWPAYMENTS_API_KEY || NOWPAYMENTS_API_KEY === 'your-crypto-gateway-api-key';

interface CreatePaymentParams {
  priceAmount: number;
  priceCurrency: string;
  payCurrency: string;
  orderId: string;
  orderDescription: string;
  ipnCallbackUrl: string;
}

interface PaymentResponse {
  paymentId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  priceAmount: number;
  priceCurrency: string;
  orderId: string;
  paymentStatus: string;
  createdAt: string;
  expirationEstimateDate: string;
}

/**
 * Create a payment invoice
 */
export async function createPayment(
  params: CreatePaymentParams
): Promise<{ success: boolean; data?: PaymentResponse; error?: string }> {
  if (USE_MOCK) {
    return createMockPayment(params);
  }

  try {
    const response = await fetch(`${NOWPAYMENTS_API_URL}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': NOWPAYMENTS_API_KEY!,
      },
      body: JSON.stringify({
        price_amount: params.priceAmount,
        price_currency: params.priceCurrency,
        pay_currency: params.payCurrency,
        order_id: params.orderId,
        order_description: params.orderDescription,
        ipn_callback_url: params.ipnCallbackUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `NOWPayments API error: ${error}` };
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        paymentId: data.payment_id,
        payAddress: data.pay_address,
        payAmount: data.pay_amount,
        payCurrency: data.pay_currency,
        priceAmount: data.price_amount,
        priceCurrency: data.price_currency,
        orderId: data.order_id,
        paymentStatus: data.payment_status,
        createdAt: data.created_at,
        expirationEstimateDate: data.expiration_estimate_date,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get payment status
 */
export async function getPaymentStatus(
  paymentId: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  if (USE_MOCK) {
    return { success: true, status: 'finished' };
  }

  try {
    const response = await fetch(`${NOWPAYMENTS_API_URL}/payment/${paymentId}`, {
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY!,
      },
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to get payment status' };
    }

    const data = await response.json();
    return { success: true, status: data.payment_status };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Verify webhook signature (security)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (USE_MOCK) {
    return true; // In mock mode, always valid
  }

  // Real implementation would use HMAC-SHA512
  const crypto = require('crypto');
  const secret = process.env.CRYPTO_WEBHOOK_SECRET || '';
  const hmac = crypto.createHmac('sha512', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  return signature === expectedSignature;
}

// ─── MOCK IMPLEMENTATION (for development) ───────────────────────────────────

/**
 * Mock payment creation (instant, no real crypto)
 * Now uses live rates from CoinGecko
 */
async function createMockPayment(
  params: CreatePaymentParams
): Promise<{ success: boolean; data: PaymentResponse }> {
  const mockAddresses: Record<string, string> = {
    BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
    USDT: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5Kcbk8e',
  };

  // Get live rates from CoinGecko
  const rates = await getLiveCryptoRates();

  const mockAmounts: Record<string, number> = {
    BTC: params.priceAmount / rates.BTC,
    ETH: params.priceAmount / rates.ETH,
    USDT: params.priceAmount / rates.USDT,
  };

  const paymentId = 'MOCK-' + Date.now();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30min expiry

  console.log('🎭 MOCK PAYMENT CREATED:');
  console.log(`   Payment ID: ${paymentId}`);
  console.log(`   Order ID: ${params.orderId}`);
  console.log(`   Amount: $${params.priceAmount / 100} USD`);
  console.log(`   Rate (${params.payCurrency}): $${rates[params.payCurrency as keyof typeof rates].toLocaleString()} USD`);
  console.log(`   Pay: ${mockAmounts[params.payCurrency].toFixed(8)} ${params.payCurrency}`);
  console.log(`   Address: ${mockAddresses[params.payCurrency]}`);
  console.log('   Status: waiting (mock will auto-confirm in 10s)');

  return {
    success: true,
    data: {
      paymentId,
      payAddress: mockAddresses[params.payCurrency] || 'mock_address',
      payAmount: mockAmounts[params.payCurrency] || 0,
      payCurrency: params.payCurrency,
      priceAmount: params.priceAmount,
      priceCurrency: params.priceCurrency,
      orderId: params.orderId,
      paymentStatus: 'waiting',
      createdAt: new Date().toISOString(),
      expirationEstimateDate: expiresAt.toISOString(),
    },
  };
}

/**
 * Simulate a completed payment (for testing)
 */
export async function simulatePaymentConfirmation(
  paymentId: string,
  orderId: string
): Promise<void> {
  if (!USE_MOCK) {
    throw new Error('simulatePaymentConfirmation is only available in mock mode');
  }

  console.log(`🎭 SIMULATING PAYMENT CONFIRMATION for ${paymentId}...`);

  // Simulate webhook delay (10 seconds)
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // Call our own webhook
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/crypto/webhook`;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nowpayments-sig': 'mock_signature',
      },
      body: JSON.stringify({
        payment_id: paymentId,
        order_id: orderId,
        payment_status: 'finished',
        pay_amount: 0.001,
        pay_currency: 'BTC',
        price_amount: 189,
        price_currency: 'USD',
        created_at: new Date().toISOString(),
      }),
    });

    console.log('✅ Mock webhook triggered successfully');
  } catch (error) {
    console.error('❌ Mock webhook failed:', error);
  }
}
