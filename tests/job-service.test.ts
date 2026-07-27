import { describe, expect, it, jest } from "@jest/globals";

import type { JobRepository } from "../src/jobs/job-repository.js";
import { JobService } from "../src/jobs/job-service.js";
import type {
  CreateJobInput,
  CreatedJobRecord,
} from "../src/jobs/types.js";
import type {
  StartClipGenerationInput,
  WorkflowStarter,
} from "../src/jobs/workflow-starter.js";

describe("JobService.createJob", () => {
  it("creates a job, starts its workflow, and stores the workflow ID", async () => {
    const input: CreateJobInput = {
      youtubeUrl: "https://www.youtube.com/watch?v=abc123",
      clipSelectionMode: "sequential",
      requestedClipCount: 1,
    };
    const createdJob: CreatedJobRecord = {
      ...input,
      id: "job-123",
      status: "queued",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const create = jest.fn(async (_input: CreateJobInput) => createdJob);
    const setWorkflowId = jest.fn(
      async (_jobId: string, _workflowId: string) => undefined,
    );
    const startClipGeneration = jest.fn(
      async (_input: StartClipGenerationInput) =>
        "clip-generation-job-123",
    );

    const jobRepository: JobRepository = {
      list: jest.fn(async () => []),
      create,
      setWorkflowId,
      findById: jest.fn(async () => null),
      findTranscriptById: jest.fn(async () => null),
      findStatusById: jest.fn(async () => null),
    };
    const workflowStarter: WorkflowStarter = {
      startClipGeneration,
    };
    const jobService = new JobService(jobRepository, workflowStarter);

    const result = await jobService.createJob(input);

    expect(create).toHaveBeenCalledWith(input);
    expect(startClipGeneration).toHaveBeenCalledWith({
      jobId: "job-123",
      youtubeUrl: input.youtubeUrl,
    });
    expect(setWorkflowId).toHaveBeenCalledWith(
      "job-123",
      "clip-generation-job-123",
    );
    expect(result).toEqual({
      ...createdJob,
      workflowId: "clip-generation-job-123",
    });
  });
});
