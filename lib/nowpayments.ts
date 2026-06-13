import { getLiveCryptoRates } from './crypto-rates';
import { getErrorMessage } from './errors';
import crypto from 'crypto';

const NOWPAYMENTS_API_KEY = process.env.CRYPTO_GATEWAY_API_KEY;
const USE_SANDBOX = process.env.NOWPAYMENTS_SANDBOX === 'true';
const NOWPAYMENTS_API_URL = USE_SANDBOX
  ? 'https://api-sandbox.nowpayments.io/v1'
  : 'https://api.nowpayments.io/v1';
const USE_MOCK = process.env.NODE_ENV !== 'production' &&
  (!NOWPAYMENTS_API_KEY || NOWPAYMENTS_API_KEY === 'your-crypto-gateway-api-key');

// NOWPayments uses lowercase currency codes with network suffix
const CURRENCY_MAP: Record<string, string> = {
  BTC: 'btc',
  ETH: 'eth',
  USDT: 'usdttrc20',
};

export function mapCurrencyToNowPayments(coin: string): string {
  return CURRENCY_MAP[coin.toUpperCase()] || coin.toLowerCase();
}

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
  payinExtraId: string | null;
  network: string;
}

export async function createPayment(
  params: CreatePaymentParams
): Promise<{ success: boolean; data?: PaymentResponse; error?: string }> {
  if (USE_MOCK) {
    return createMockPayment(params);
  }

  try {
    const payCurrency = mapCurrencyToNowPayments(params.payCurrency);

    const response = await fetch(`${NOWPAYMENTS_API_URL}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': NOWPAYMENTS_API_KEY!,
      },
      body: JSON.stringify({
        price_amount: params.priceAmount,
        price_currency: params.priceCurrency.toLowerCase(),
        pay_currency: payCurrency,
        order_id: params.orderId,
        order_description: params.orderDescription,
        ipn_callback_url: params.ipnCallbackUrl,
        ...(USE_SANDBOX && { case: 'success' }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NOWPayments API error:', response.status, errorText);
      return { success: false, error: `Payment gateway error: ${response.status}` };
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        paymentId: String(data.payment_id),
        payAddress: data.pay_address,
        payAmount: data.pay_amount,
        payCurrency: data.pay_currency,
        priceAmount: data.price_amount,
        priceCurrency: data.price_currency,
        orderId: data.order_id,
        paymentStatus: data.payment_status,
        createdAt: data.created_at,
        expirationEstimateDate: data.expiration_estimate_date,
        payinExtraId: data.payin_extra_id || null,
        network: data.network || '',
      },
    };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

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
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Verify IPN webhook signature per NOWPayments docs:
 * 1. Sort the payload object by keys recursively
 * 2. JSON.stringify the sorted object
 * 3. HMAC-SHA512 with IPN secret
 * 4. Compare with x-nowpayments-sig header
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  if (USE_MOCK) {
    return true;
  }

  const secret = process.env.CRYPTO_WEBHOOK_SECRET;

  if (!secret) {
    console.error('CRYPTO_WEBHOOK_SECRET is not configured — rejecting webhook');
    return false;
  }

  if (!signature) {
    return false;
  }

  try {
    const payload = JSON.parse(rawBody);
    const sortedPayload = sortObject(payload);
    const sortedString = JSON.stringify(sortedPayload);

    const hmac = crypto.createHmac('sha512', secret.trim());
    hmac.update(sortedString);
    const expectedSignature = hmac.digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

function sortObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(obj).sort().reduce(
    (result: Record<string, unknown>, key: string) => {
      const value = obj[key];
      result[key] = (value && typeof value === 'object' && !Array.isArray(value))
        ? sortObject(value as Record<string, unknown>)
        : value;
      return result;
    },
    {}
  );
}

// ─── MOCK IMPLEMENTATION (for development) ───────────────────────────────────

async function createMockPayment(
  params: CreatePaymentParams
): Promise<{ success: boolean; data: PaymentResponse }> {
  const mockAddresses: Record<string, string> = {
    BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
    USDT: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5Kcbk8e',
  };

  const rates = await getLiveCryptoRates();
  const upperCoin = params.payCurrency.toUpperCase();

  const payAmount = params.priceAmount / (rates[upperCoin as keyof typeof rates] || 1);

  const paymentId = 'MOCK-' + Date.now();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30);

  console.log(`🎭 MOCK PAYMENT: ${paymentId} | $${params.priceAmount} → ${payAmount.toFixed(8)} ${upperCoin}`);

  return {
    success: true,
    data: {
      paymentId,
      payAddress: mockAddresses[upperCoin] || 'mock_address',
      payAmount,
      payCurrency: mapCurrencyToNowPayments(params.payCurrency),
      priceAmount: params.priceAmount,
      priceCurrency: params.priceCurrency,
      orderId: params.orderId,
      paymentStatus: 'waiting',
      createdAt: new Date().toISOString(),
      expirationEstimateDate: expiresAt.toISOString(),
      payinExtraId: null,
      network: upperCoin.toLowerCase(),
    },
  };
}

export async function simulatePaymentConfirmation(
  paymentId: string,
  orderId: string
): Promise<void> {
  if (!USE_MOCK) {
    throw new Error('simulatePaymentConfirmation is only available in mock mode');
  }

  await new Promise((resolve) => setTimeout(resolve, 10000));

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
        pay_currency: 'btc',
        price_amount: 50,
        price_currency: 'usd',
        actually_paid: 0.001,
        outcome_amount: 0.001,
        outcome_currency: 'btc',
      }),
    });
  } catch (error) {
    console.error('Mock webhook failed:', error);
  }
}
