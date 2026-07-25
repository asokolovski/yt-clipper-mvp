import type { Pool } from "pg";

import type { ClipRepository } from "./clip-repository.js";
import type { Clip, ClipFileRecord, ClipStatus } from "./types.js";

type ClipRow = {
  id: string;
  title: string;
  start_time_seconds: number;
  end_time_seconds: number;
  reason: string;
  status: ClipStatus;
  file_path: string | null;
};

type ClipFileRow = Pick<ClipRow, "id" | "title" | "status" | "file_path">;

export class PostgresClipRepository implements ClipRepository {
  constructor(private readonly pool: Pool) {}

  async findByJobId(jobId: string): Promise<Clip[]> {
    const result = await this.pool.query<ClipRow>(
      `
        SELECT
          id,
          title,
          start_time_seconds,
          end_time_seconds,
          reason,
          status,
          file_path
        FROM clips
        WHERE job_id = $1
        ORDER BY start_time_seconds
      `,
      [jobId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      startTimeSeconds: row.start_time_seconds,
      endTimeSeconds: row.end_time_seconds,
      reason: row.reason,
      status: row.status,
      filePath: row.file_path,
    }));
  }

  async findFileRecordById(clipId: string): Promise<ClipFileRecord | null> {
    const result = await this.pool.query<ClipFileRow>(
      `
        SELECT
          id,
          title,
          status,
          file_path
        FROM clips
        WHERE id::text = $1
      `,
      [clipId],
    );

    const row = result.rows[0];
    return row ? mapClipFileRow(row) : null;
  }

  async findCompletedFileRecordsByJobId(
    jobId: string,
  ): Promise<ClipFileRecord[]> {
    const result = await this.pool.query<ClipFileRow>(
      `
        SELECT
          id,
          title,
          status,
          file_path
        FROM clips
        WHERE job_id = $1
          AND status = 'completed'
        ORDER BY start_time_seconds
      `,
      [jobId],
    );

    return result.rows.map(mapClipFileRow);
  }
}

function mapClipFileRow(row: ClipFileRow): ClipFileRecord {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    filePath: row.file_path,
  };
}
