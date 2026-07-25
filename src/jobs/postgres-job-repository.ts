import type { Pool } from "pg";

import type { ClipSelectionMode } from "../clip-selection/types.js";
import type { JobRepository } from "./job-repository.js";
import type {
  CreateJobInput,
  CreatedJobRecord,
  Job,
  JobStatus,
  JobStatusRecord,
  JobTranscript,
} from "./types.js";

type JobRow = {
  id: string;
  workflow_id: string | null;
  youtube_url: string;
  clip_selection_mode: ClipSelectionMode;
  requested_clip_count: number;
  status: JobStatus;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
};

export class PostgresJobRepository implements JobRepository {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<Job[]> {
    const result = await this.pool.query<JobRow>(
      `
        SELECT
          id,
          workflow_id,
          youtube_url,
          clip_selection_mode,
          requested_clip_count,
          status,
          error_message,
          created_at,
          updated_at
        FROM jobs
        ORDER BY created_at DESC
      `,
    );

    return result.rows.map(mapJobRow);
  }

  async create(input: CreateJobInput): Promise<CreatedJobRecord> {
    const result = await this.pool.query<
      Pick<
        JobRow,
        | "id"
        | "youtube_url"
        | "clip_selection_mode"
        | "requested_clip_count"
        | "status"
        | "created_at"
      >
    >(
      `
        INSERT INTO jobs (youtube_url, clip_selection_mode, requested_clip_count)
        VALUES ($1, $2, $3)
        RETURNING
          id,
          youtube_url,
          clip_selection_mode,
          requested_clip_count,
          status,
          created_at
      `,
      [
        input.youtubeUrl,
        input.clipSelectionMode,
        input.requestedClipCount,
      ],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Postgres did not return the created job.");
    }

    return {
      id: row.id,
      youtubeUrl: row.youtube_url,
      clipSelectionMode: row.clip_selection_mode,
      requestedClipCount: row.requested_clip_count,
      status: row.status,
      createdAt: row.created_at,
    };
  }

  async setWorkflowId(jobId: string, workflowId: string): Promise<void> {
    const result = await this.pool.query(
      `
        UPDATE jobs
        SET workflow_id = $1, updated_at = NOW()
        WHERE id = $2
      `,
      [workflowId, jobId],
    );

    if (result.rowCount !== 1) {
      throw new Error(`Could not save workflow ID because job ${jobId} was not found.`);
    }
  }

  async findById(jobId: string): Promise<Job | null> {
    const result = await this.pool.query<JobRow>(
      `
        SELECT
          id,
          workflow_id,
          youtube_url,
          clip_selection_mode,
          requested_clip_count,
          status,
          error_message,
          created_at,
          updated_at
        FROM jobs
        WHERE id::text = $1
      `,
      [jobId],
    );

    const row = result.rows[0];
    return row ? mapJobRow(row) : null;
  }

  async findTranscriptById(jobId: string): Promise<JobTranscript | null> {
    const result = await this.pool.query<{
      id: string;
      status: JobStatus;
      transcript_source: string | null;
      transcript_text: string | null;
    }>(
      `
        SELECT id, status, transcript_source, transcript_text
        FROM jobs
        WHERE id::text = $1
      `,
      [jobId],
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return {
      jobId: row.id,
      status: row.status,
      transcriptSource: row.transcript_source,
      transcriptText: row.transcript_text,
    };
  }

  async findStatusById(jobId: string): Promise<JobStatusRecord | null> {
    const result = await this.pool.query<{
      id: string;
      status: JobStatus;
    }>(
      `
        SELECT id, status
        FROM jobs
        WHERE id::text = $1
      `,
      [jobId],
    );

    return result.rows[0] ?? null;
  }
}

function mapJobRow(row: JobRow): Job {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    youtubeUrl: row.youtube_url,
    clipSelectionMode: row.clip_selection_mode,
    requestedClipCount: row.requested_clip_count,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
