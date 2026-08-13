import { describe, it, expect } from 'vitest';
import { computeTotalCents, volumeDiscountPercent, nextTier, VOLUME_TIERS } from '../lib/pricing';

// The checkout UI and the payment route both call computeTotalCents. If they
// ever disagree, a buyer is shown one price and charged another — so these
// tests pin the arithmetic rather than the presentation.

describe('volumeDiscountPercent', () => {
  it('gives nothing below the first tier', () => {
    expect(volumeDiscountPercent(1)).toBe(0);
    expect(volumeDiscountPercent(2)).toBe(0);
  });

  it('applies each tier at its exact boundary', () => {
    expect(volumeDiscountPercent(3)).toBe(5);
    expect(volumeDiscountPercent(5)).toBe(8);
    expect(volumeDiscountPercent(10)).toBe(12);
  });

  it('keeps the highest tier for larger orders', () => {
    expect(volumeDiscountPercent(50)).toBe(12);
  });

  it('never goes backwards as quantity grows', () => {
    let previous = 0;
    for (let q = 1; q <= 30; q++) {
      const current = volumeDiscountPercent(q);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });
});

describe('nextTier', () => {
  it('points at the next reachable tier', () => {
    expect(nextTier(1)?.minQuantity).toBe(3);
    expect(nextTier(3)?.minQuantity).toBe(5);
    expect(nextTier(6)?.minQuantity).toBe(10);
  });

  it('returns null once the top tier is reached', () => {
    expect(nextTier(10)).toBeNull();
    expect(nextTier(99)).toBeNull();
  });
});

describe('computeTotalCents', () => {
  it('charges list price for a single unit', () => {
    const { totalCents, volumePercent } = computeTotalCents(5000, 1);
    expect(totalCents).toBe(5000);
    expect(volumePercent).toBe(0);
  });

  it('applies the volume discount', () => {
    // 3 × $50 = $150, less 5%
    expect(computeTotalCents(5000, 3).totalCents).toBe(14250);
  });

  it('stacks the promo code on top of the volume discount', () => {
    // 5 × $50 = $250, less 8% = $230, less 3% = $223.10
    const { totalCents, totalPercentOff } = computeTotalCents(5000, 5, 3);
    expect(totalCents).toBe(22310);
    expect(totalPercentOff).toBe(11);
  });

  it('returns whole cents, never fractions', () => {
    for (let q = 1; q <= 20; q++) {
      const { totalCents } = computeTotalCents(7500, q, 3);
      expect(Number.isInteger(totalCents)).toBe(true);
    }
  });

  it('never charges more than list price', () => {
    for (let q = 1; q <= 20; q++) {
      const { totalCents } = computeTotalCents(5000, q, 3);
      expect(totalCents).toBeLessThanOrEqual(5000 * q);
    }
  });

  it('handles a zero-priced product without dividing by zero', () => {
    expect(computeTotalCents(0, 5, 3)).toEqual({
      totalCents: 0,
      volumePercent: 8,
      totalPercentOff: 0,
    });
  });
});

describe('VOLUME_TIERS', () => {
  it('is ordered from largest to smallest so lookup finds the best tier first', () => {
    const quantities = VOLUME_TIERS.map((t) => t.minQuantity);
    expect(quantities).toEqual([...quantities].sort((a, b) => b - a));
  });
});
