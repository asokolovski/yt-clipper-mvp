import type { ClipRepository } from "./clip-repository.js";
import type { Clip, ClipFileRecord } from "./types.js";

export interface ClipsService {
  listClipsForJob(jobId: string): Promise<Clip[]>;
  getClipFileRecord(clipId: string): Promise<ClipFileRecord | null>;
  listCompletedClipFileRecords(jobId: string): Promise<ClipFileRecord[]>;
}

export class ClipService implements ClipsService {
  constructor(private readonly clips: ClipRepository) {}

  listClipsForJob(jobId: string): Promise<Clip[]> {
    return this.clips.findByJobId(jobId);
  }

  getClipFileRecord(clipId: string): Promise<ClipFileRecord | null> {
    return this.clips.findFileRecordById(clipId);
  }

  listCompletedClipFileRecords(jobId: string): Promise<ClipFileRecord[]> {
    return this.clips.findCompletedFileRecordsByJobId(jobId);
  }
}
