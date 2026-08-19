-- Migration 011 — Full account folder delivery
-- Stores the binary files that ship with an account (identity documents and
-- user-agent screenshots) so the buyer can download the complete folder as a
-- ZIP, not just the credentials text file.
--
-- Non-destructive: ADD COLUMN IF NOT EXISTS only.

ALTER TABLE stock_items
  ADD COLUMN IF NOT EXISTS files TEXT;  -- JSON array: [{name, mime, data(base64)}]
