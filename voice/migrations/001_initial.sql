-- Run this in the Neon SQL Editor (or from Cursor with a Postgres extension).
-- Creates the table used by lib/db.ts.

CREATE TABLE IF NOT EXISTS learner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  profile JSONB NOT NULL
);

-- Optional: index for listing by date
CREATE INDEX IF NOT EXISTS idx_learner_profiles_created_at
  ON learner_profiles (created_at DESC);
