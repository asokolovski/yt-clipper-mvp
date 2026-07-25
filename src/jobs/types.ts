import type { ClipSelectionMode } from "../clip-selection/types.js";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type CreateJobInput = {
  youtubeUrl: string;
  clipSelectionMode: ClipSelectionMode;
  requestedClipCount: number;
};

export type CreatedJobRecord = CreateJobInput & {
  id: string;
  status: JobStatus;
  createdAt: Date;
};

export type CreatedJob = CreatedJobRecord & {
  workflowId: string;
};

export type Job = CreatedJobRecord & {
  workflowId: string | null;
  errorMessage: string | null;
  updatedAt: Date;
};

export type JobTranscript = {
  jobId: string;
  status: JobStatus;
  transcriptSource: string | null;
  transcriptText: string | null;
};

export type JobStatusRecord = {
  id: string;
  status: JobStatus;
};
