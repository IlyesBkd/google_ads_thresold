-- Migration 010 — Full account delivery fields
-- Adds the extra fields shipped with FR/threshold accounts so they survive
-- import and delivery instead of being stripped to the 5 base columns.
--
-- Non-destructive: ADD COLUMN IF NOT EXISTS only.

ALTER TABLE stock_items
  ADD COLUMN IF NOT EXISTS cookies      TEXT,  -- Dolphin session cookies (JSON array)
  ADD COLUMN IF NOT EXISTS backup_codes TEXT,  -- 10 Google backup codes (newline-separated)
  ADD COLUMN IF NOT EXISTS seed_phrase  TEXT,  -- BIP39 recovery seed (12 words)
  ADD COLUMN IF NOT EXISTS phone_number TEXT,  -- masked phone + activationflow link
  ADD COLUMN IF NOT EXISTS user_agent   TEXT;  -- browser user-agent string
