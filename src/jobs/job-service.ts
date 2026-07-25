import type { JobRepository } from "./job-repository.js";
import type {
  CreateJobInput,
  CreatedJob,
  Job,
  JobStatusRecord,
  JobTranscript,
} from "./types.js";
import type { WorkflowStarter } from "./workflow-starter.js";

export interface JobsService {
  listJobs(): Promise<Job[]>;
  createJob(input: CreateJobInput): Promise<CreatedJob>;
  getJob(jobId: string): Promise<Job | null>;
  getJobTranscript(jobId: string): Promise<JobTranscript | null>;
  getJobStatus(jobId: string): Promise<JobStatusRecord | null>;
}

export class JobService implements JobsService {
  constructor(
    private readonly jobs: JobRepository,
    private readonly workflows: WorkflowStarter,
  ) {}

  listJobs(): Promise<Job[]> {
    return this.jobs.list();
  }

  async createJob(input: CreateJobInput): Promise<CreatedJob> {
    const createdJob = await this.jobs.create(input);
    console.log("Created job:", createdJob);

    const workflowId = await this.workflows.startClipGeneration({
      jobId: createdJob.id,
      youtubeUrl: createdJob.youtubeUrl,
    });

    await this.jobs.setWorkflowId(createdJob.id, workflowId);

    return {
      ...createdJob,
      workflowId,
    };
  }

  getJob(jobId: string): Promise<Job | null> {
    return this.jobs.findById(jobId);
  }

  getJobTranscript(jobId: string): Promise<JobTranscript | null> {
    return this.jobs.findTranscriptById(jobId);
  }

  getJobStatus(jobId: string): Promise<JobStatusRecord | null> {
    return this.jobs.findStatusById(jobId);
  }
}
