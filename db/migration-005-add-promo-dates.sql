-- ═══════════════════════════════════════════════════════════════════════════
-- ADSCALE Migration 005 — Add promo tracking dates to stock_items
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE stock_items
  ADD COLUMN google_ads_created_at DATE,
  ADD COLUMN promo_expires_at DATE;

-- Update existing accounts created 2026-06-21
UPDATE stock_items
SET
  google_ads_created_at = '2026-06-21',
  promo_expires_at = '2026-06-21'::DATE + INTERVAL '60 days'
WHERE google_ads_created_at IS NULL;

COMMENT ON COLUMN stock_items.google_ads_created_at IS 'Date the Google Ads account was created on Google';
COMMENT ON COLUMN stock_items.promo_expires_at IS '60 days after creation — when the €400 promo expires';
