import type {
  CreateJobInput,
  CreatedJobRecord,
  Job,
  JobStatusRecord,
  JobTranscript,
} from "./types.js";

export interface JobRepository {
  list(): Promise<Job[]>;
  create(input: CreateJobInput): Promise<CreatedJobRecord>;
  setWorkflowId(jobId: string, workflowId: string): Promise<void>;
  findById(jobId: string): Promise<Job | null>;
  findTranscriptById(jobId: string): Promise<JobTranscript | null>;
  findStatusById(jobId: string): Promise<JobStatusRecord | null>;
}
