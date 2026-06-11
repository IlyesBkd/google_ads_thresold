/**
 * Crypto rates helper using CoinGecko API (free, no API key required)
 * Provides live BTC, ETH, and USDT prices in USD
 */

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

export type CryptoRates = {
  BTC: number;
  ETH: number;
  USDT: number;
};

// Fallback rates (used if API fails)
const FALLBACK_RATES: CryptoRates = {
  BTC: 95000,
  ETH: 3500,
  USDT: 1,
};

// Cache for rates (60 seconds TTL)
let cachedRates: CryptoRates | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds

/**
 * Fetch live crypto rates from CoinGecko API
 * Includes caching (60s) and fallback on error
 */
export async function getLiveCryptoRates(): Promise<CryptoRates> {
  // Return cached rates if still valid
  const now = Date.now();
  if (cachedRates && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedRates;
  }

  try {
    // Fetch from CoinGecko API
    const response = await fetch(
      `${COINGECKO_API}?ids=bitcoin,ethereum,tether&vs_currencies=usd`,
      {
        headers: {
          'Accept': 'application/json',
        },
        // Cache for 60 seconds
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract rates
    const rates: CryptoRates = {
      BTC: data.bitcoin?.usd || FALLBACK_RATES.BTC,
      ETH: data.ethereum?.usd || FALLBACK_RATES.ETH,
      USDT: data.tether?.usd || FALLBACK_RATES.USDT,
    };

    // Validate rates (sanity check)
    if (rates.BTC < 1000 || rates.BTC > 500000) {
      console.warn('Invalid BTC rate from API, using fallback:', rates.BTC);
      rates.BTC = FALLBACK_RATES.BTC;
    }
    if (rates.ETH < 100 || rates.ETH > 50000) {
      console.warn('Invalid ETH rate from API, using fallback:', rates.ETH);
      rates.ETH = FALLBACK_RATES.ETH;
    }
    if (rates.USDT < 0.95 || rates.USDT > 1.05) {
      console.warn('Invalid USDT rate from API, using fallback:', rates.USDT);
      rates.USDT = FALLBACK_RATES.USDT;
    }

    // Update cache
    cachedRates = rates;
    cacheTimestamp = now;

    return rates;
  } catch (error) {
    console.error('Error fetching crypto rates from CoinGecko:', error);

    // Return cached rates if available
    if (cachedRates) {
      console.log('Using cached rates after API error');
      return cachedRates;
    }

    // Last resort: fallback rates
    console.log('Using fallback rates');
    return FALLBACK_RATES;
  }
}

/**
 * Get rate for a specific coin
 */
export async function getCoinRate(coin: 'BTC' | 'ETH' | 'USDT'): Promise<number> {
  const rates = await getLiveCryptoRates();
  return rates[coin];
}

/**
 * Calculate crypto amount from USD amount
 */
export async function calculateCryptoAmount(
  usdAmount: number,
  coin: 'BTC' | 'ETH' | 'USDT'
): Promise<{ amount: number; rate: number }> {
  const rate = await getCoinRate(coin);
  const amount = usdAmount / rate;

  return {
    amount,
    rate,
  };
}

/**
 * Format crypto amount with appropriate decimals
 */
export function formatCryptoAmount(amount: number, coin: 'BTC' | 'ETH' | 'USDT'): string {
  if (coin === 'BTC') {
    return amount.toFixed(8); // BTC: 8 decimals (satoshi precision)
  }
  if (coin === 'ETH') {
    return amount.toFixed(6); // ETH: 6 decimals (sufficient for most amounts)
  }
  // USDT
  return amount.toFixed(2); // USDT: 2 decimals (like USD)
}
