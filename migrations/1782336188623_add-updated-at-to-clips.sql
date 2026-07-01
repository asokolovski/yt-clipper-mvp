-- Up Migration

ALTER TABLE clips
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Down Migration

ALTER TABLE clips
DROP COLUMN updated_at;
