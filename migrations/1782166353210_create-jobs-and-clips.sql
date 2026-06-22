-- Up Migration

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT UNIQUE,
  youtube_url TEXT NOT NULL CHECK (BTRIM(youtube_url) <> ''),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  transcript_source TEXT,
  transcript_text TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (BTRIM(title) <> ''),
  start_time_seconds DOUBLE PRECISION NOT NULL CHECK (start_time_seconds >= 0),
  end_time_seconds DOUBLE PRECISION NOT NULL,
  reason TEXT NOT NULL,
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'selected'
    CHECK (status IN ('selected', 'rendering', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time_seconds > start_time_seconds)
);

CREATE INDEX clips_job_id_index ON clips(job_id);

-- Down Migration

DROP TABLE clips;
DROP TABLE jobs;
