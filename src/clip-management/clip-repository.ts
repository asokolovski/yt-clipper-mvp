import type { Clip, ClipFileRecord } from "./types.js";

export interface ClipRepository {
  findByJobId(jobId: string): Promise<Clip[]>;
  findFileRecordById(clipId: string): Promise<ClipFileRecord | null>;
  findCompletedFileRecordsByJobId(jobId: string): Promise<ClipFileRecord[]>;
}
