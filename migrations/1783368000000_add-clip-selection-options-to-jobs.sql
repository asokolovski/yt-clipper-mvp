-- Up Migration

ALTER TABLE jobs
ADD COLUMN clip_selection_mode TEXT NOT NULL DEFAULT 'ai'
  CHECK (clip_selection_mode IN ('ai', 'sequential')),
ADD COLUMN requested_clip_count INTEGER NOT NULL DEFAULT 3
  CHECK (requested_clip_count >= 1 AND requested_clip_count <= 20);

-- Down Migration

ALTER TABLE jobs
DROP COLUMN requested_clip_count,
DROP COLUMN clip_selection_mode;
