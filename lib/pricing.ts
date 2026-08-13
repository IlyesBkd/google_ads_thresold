/**
 * Volume pricing.
 *
 * Buyers here are mostly agencies, who rarely want a single account. The tiers
 * are shared by the client (to show the saving) and the server (to charge it),
 * so the displayed price can never drift from the amount actually invoiced.
 */

export interface VolumeTier {
  minQuantity: number;
  discountPercent: number;
}

export const VOLUME_TIERS: VolumeTier[] = [
  { minQuantity: 10, discountPercent: 12 },
  { minQuantity: 5, discountPercent: 8 },
  { minQuantity: 3, discountPercent: 5 },
];

/** Percentage off for a quantity; 0 below the first tier. */
export function volumeDiscountPercent(quantity: number): number {
  const tier = VOLUME_TIERS.find((t) => quantity >= t.minQuantity);
  return tier ? tier.discountPercent : 0;
}

/** The next tier a buyer could reach, for an upsell hint. */
export function nextTier(quantity: number): VolumeTier | null {
  const upcoming = [...VOLUME_TIERS]
    .sort((a, b) => a.minQuantity - b.minQuantity)
    .find((t) => quantity < t.minQuantity);
  return upcoming || null;
}

/**
 * Total in cents for an order.
 *
 * The volume discount and the promo code stack, applied in that order, and the
 * result is rounded once at the end so the client and server always agree.
 */
export function computeTotalCents(
  unitPriceCents: number,
  quantity: number,
  promoPercent = 0
): { totalCents: number; volumePercent: number; totalPercentOff: number } {
  const volumePercent = volumeDiscountPercent(quantity);
  const gross = unitPriceCents * quantity;
  const afterVolume = gross * (1 - volumePercent / 100);
  const afterPromo = afterVolume * (1 - promoPercent / 100);

  return {
    totalCents: Math.round(afterPromo),
    volumePercent,
    totalPercentOff: gross > 0 ? Math.round((1 - afterPromo / gross) * 100) : 0,
  };
}
