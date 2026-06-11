-- ═══════════════════════════════════════════════════════════════════════════
-- ADSCALE Threshold Accounts Store - Seed Data
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Insert default admin ────────────────────────────────────────────────────
-- Password: ChangeThisPassword123!
-- Hash generated with bcrypt (10 rounds)
INSERT INTO admins (id, email, password_hash, role)
VALUES (
  'admin-001',
  'admin@adscale.io',
  '$2a$10$X5Y8KZ.vQe3Jf9mN2lO4PeH7Rq6Sw8Tx0Vy2Uz4Wa6Xb8Yc0Zd2Ae',  -- PLACEHOLDER - will be replaced by script
  'owner'
)
ON CONFLICT (email) DO NOTHING;

-- ─── Insert products ──────────────────────────────────────────────────────────
INSERT INTO products (id, name, description, price, threshold_value, category, low_stock_alert, active)
VALUES
  (
    'PROD-350',
    '$350 Threshold Account',
    'Aged, fully verified Google Ads account with $350 billing threshold unlocked — spend first, pay Google later. Delivered instantly as .txt credentials with login + recovery details.',
    18900,  -- $189.00 in cents
    350,
    'threshold',
    5,
    true
  ),
  (
    'PROD-500',
    '$500 Threshold Account',
    'Higher-limit account with a $500 threshold and extended billing history — built to scale spend from day one. Includes login + recovery details with priority support.',
    27900,  -- $279.00 in cents
    500,
    'threshold',
    5,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ─── Insert sample stock (6 credentials for testing) ─────────────────────────
INSERT INTO stock_items (product_id, email, password, status)
VALUES
  ('PROD-350', 'threshold.acc88@gmail.com', 'Ads!Thresh88x', 'available'),
  ('PROD-350', 'googleads.user001@gmail.com', 'Thr3sh0ld!2024', 'available'),
  ('PROD-350', 'adspro.buyer42@gmail.com', 'G00gl3Ads$ecure', 'available'),
  ('PROD-500', 'gads.premium19@gmail.com', 'Pr3m1um#Gads19', 'available'),
  ('PROD-500', 'adsthresh.elite7@gmail.com', 'El1te7!Threshold', 'available'),
  ('PROD-500', 'threshold.500pro@gmail.com', '500Pr0!G00gle', 'available')
ON CONFLICT (email, product_id) DO NOTHING;

-- ─── Insert initial log entry ─────────────────────────────────────────────────
INSERT INTO logs (type, message, admin_id)
VALUES (
  'import',
  'Database seeded with 2 products and 6 sample credentials',
  'admin-001'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Seeding complete
-- ═══════════════════════════════════════════════════════════════════════════
