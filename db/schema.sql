-- ═══════════════════════════════════════════════════════════════════════════
-- ADSCALE Threshold Accounts Store - Database Schema
-- PostgreSQL (Neon Serverless)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Drop existing tables (development only) ────────────────────────────────
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS download_tokens CASCADE;
DROP TABLE IF EXISTS stock_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- ─── Custom types ────────────────────────────────────────────────────────────
DROP TYPE IF EXISTS stock_status CASCADE;
CREATE TYPE stock_status AS ENUM ('available', 'reserved', 'sold', 'error');

DROP TYPE IF EXISTS order_status CASCADE;
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'delivered', 'failed', 'refunded');

DROP TYPE IF EXISTS admin_role CASCADE;
CREATE TYPE admin_role AS ENUM ('owner', 'manager', 'support');

DROP TYPE IF EXISTS log_type CASCADE;
CREATE TYPE log_type AS ENUM ('import', 'sale', 'delivery', 'login', 'error', 'refund');

-- ─── Products table ──────────────────────────────────────────────────────────
CREATE TABLE products (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name              TEXT NOT NULL,
  description       TEXT NOT NULL,
  price             INTEGER NOT NULL,              -- Price in USD cents (18900 = $189)
  threshold_value   INTEGER NOT NULL,              -- 350 or 500
  category          TEXT NOT NULL DEFAULT 'threshold',
  low_stock_alert   INTEGER NOT NULL DEFAULT 5,    -- Alert when stock < this
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Stock items (credentials) ───────────────────────────────────────────────
CREATE TABLE stock_items (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,                         -- Google Ads account email
  password    TEXT NOT NULL,                         -- Account password
  status      stock_status NOT NULL DEFAULT 'available',
  order_id    TEXT,                                  -- Linked when sold
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_credential UNIQUE (email, product_id)
);

CREATE INDEX idx_stock_status_product ON stock_items(status, product_id);
CREATE INDEX idx_stock_order ON stock_items(order_id) WHERE order_id IS NOT NULL;

-- ─── Orders table ─────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id      TEXT NOT NULL REFERENCES products(id),
  quantity        INTEGER NOT NULL,
  customer_email  TEXT NOT NULL,
  amount          INTEGER NOT NULL,                  -- Total in USD cents
  coin            TEXT NOT NULL,                     -- BTC, ETH, USDT
  status          order_status NOT NULL DEFAULT 'pending',

  -- Crypto payment
  wallet_address  TEXT,                              -- Destination address
  tx_hash         TEXT,                              -- Blockchain transaction hash

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_status ON orders(status, created_at DESC);
CREATE INDEX idx_orders_customer ON orders(customer_email);
CREATE INDEX idx_orders_tx ON orders(tx_hash) WHERE tx_hash IS NOT NULL;

-- ─── Download tokens (temporary .txt access) ──────────────────────────────────
CREATE TABLE download_tokens (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,                  -- Random secure token
  expires_at  TIMESTAMPTZ NOT NULL,                  -- 24h from creation
  max_uses    INTEGER NOT NULL DEFAULT 3,
  uses_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_token_lookup ON download_tokens(token, expires_at);

-- ─── Admins table ─────────────────────────────────────────────────────────────
CREATE TABLE admins (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,                       -- bcrypt hashed
  role          admin_role NOT NULL DEFAULT 'manager',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Logs table (audit trail) ─────────────────────────────────────────────────
CREATE TABLE logs (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type        log_type NOT NULL,
  message     TEXT NOT NULL,
  admin_id    TEXT REFERENCES admins(id),            -- Who performed (null = system)
  order_id    TEXT REFERENCES orders(id),            -- Related order
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_type_time ON logs(type, created_at DESC);
CREATE INDEX idx_logs_time ON logs(created_at DESC);

-- ─── Settings table ──────────────────────────────────────────────────────────
CREATE TABLE settings (
  id          SERIAL PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  value       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_settings_key ON settings(key);

-- ─── Waitlist table (stock notifications) ────────────────────────────────────
CREATE TABLE waitlist (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id        TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  telegram_username TEXT NOT NULL,
  email             TEXT,                                  -- Optional backup contact
  notified          BOOLEAN NOT NULL DEFAULT false,
  notified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_waitlist_user UNIQUE (product_id, telegram_username)
);

CREATE INDEX idx_waitlist_product_pending ON waitlist(product_id, notified) WHERE notified = false;
CREATE INDEX idx_waitlist_created ON waitlist(created_at DESC);

-- ─── Add foreign key for stock_items.order_id (circular reference) ───────────
ALTER TABLE stock_items
  ADD CONSTRAINT fk_stock_order
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- Schema created successfully
-- ═══════════════════════════════════════════════════════════════════════════
