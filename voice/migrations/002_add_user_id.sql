-- Adds per-user ownership to learner_profiles.
-- Safe to run multiple times.

ALTER TABLE learner_profiles
  ADD COLUMN IF NOT EXISTS user_id text;

CREATE INDEX IF NOT EXISTS idx_learner_profiles_user_id_created_at
  ON learner_profiles (user_id, created_at DESC);

