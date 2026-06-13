export const JWT_EXPIRATION = '7d';
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const PRODUCT_PRICES_CENTS = {
  THRESHOLD_350: 18900,
  THRESHOLD_500: 27900,
} as const;

export const DOWNLOAD_DEFAULTS = {
  VALIDITY_HOURS: 24,
  MAX_USES: 3,
} as const;

export const LOW_STOCK_DEFAULT_THRESHOLD = 5;
