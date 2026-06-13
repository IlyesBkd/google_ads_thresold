import { describe, it, expect } from 'vitest';
import {
  JWT_EXPIRATION,
  COOKIE_MAX_AGE_SECONDS,
  PRODUCT_PRICES_CENTS,
  DOWNLOAD_DEFAULTS,
} from '../lib/constants';

describe('constants', () => {
  it('JWT expiration is a valid time string', () => {
    expect(JWT_EXPIRATION).toMatch(/^\d+[dhms]$/);
  });

  it('cookie max age equals 7 days in seconds', () => {
    expect(COOKIE_MAX_AGE_SECONDS).toBe(604800);
  });

  it('product prices are in cents', () => {
    expect(PRODUCT_PRICES_CENTS.THRESHOLD_350).toBe(18900);
    expect(PRODUCT_PRICES_CENTS.THRESHOLD_500).toBe(27900);
  });

  it('download defaults are reasonable', () => {
    expect(DOWNLOAD_DEFAULTS.VALIDITY_HOURS).toBeGreaterThan(0);
    expect(DOWNLOAD_DEFAULTS.MAX_USES).toBeGreaterThan(0);
  });
});
