import { describe, expect, it, jest } from "@jest/globals";
import request from "supertest";

import { createApp } from "../src/app.js";
import type { ClipsService } from "../src/clip-management/clip-service.js";
import type { JobsService } from "../src/jobs/job-service.js";
import type {
  CreateJobInput,
  CreatedJob,
} from "../src/jobs/types.js";

function createFakeClipService(): ClipsService {
  return {
    listClipsForJob: jest.fn(async () => []),
    getClipFileRecord: jest.fn(async () => null),
    listCompletedClipFileRecords: jest.fn(async () => []),
  };
}

function createFakeJobService(
  createJob: JobsService["createJob"],
): JobsService {
  return {
    listJobs: jest.fn(async () => []),
    createJob,
    getJob: jest.fn(async () => null),
    getJobTranscript: jest.fn(async () => null),
    getJobStatus: jest.fn(async () => null),
  };
}

describe("POST /api/jobs", () => {
  it("validates the request and passes it to the job service", async () => {
    const createdJob: CreatedJob = {
      id: "job-123",
      workflowId: "clip-generation-job-123",
      youtubeUrl: "https://www.youtube.com/watch?v=abc123",
      clipSelectionMode: "sequential",
      requestedClipCount: 1,
      status: "queued",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const createJob = jest.fn(
      async (_input: CreateJobInput) => createdJob,
    );
    const app = createApp({
      jobService: createFakeJobService(createJob),
      clipService: createFakeClipService(),
    });

    const response = await request(app).post("/api/jobs").send({
      youtubeUrl: " https://www.youtube.com/watch?v=abc123 ",
      clipSelectionMode: "sequential",
    });

    expect(response.status).toBe(201);
    expect(createJob).toHaveBeenCalledWith({
      youtubeUrl: "https://www.youtube.com/watch?v=abc123",
      clipSelectionMode: "sequential",
      requestedClipCount: 1,
    });
    expect(response.body).toMatchObject({
      id: "job-123",
      workflowId: "clip-generation-job-123",
      status: "queued",
    });
  });

  it("returns 400 without calling the service when the request is invalid", async () => {
    const createJob = jest.fn<JobsService["createJob"]>();
    const app = createApp({
      jobService: createFakeJobService(createJob),
      clipService: createFakeClipService(),
    });

    const response = await request(app).post("/api/jobs").send({
      youtubeUrl: "not-a-youtube-url",
      clipSelectionMode: "sequential",
    });

    expect(response.status).toBe(400);
    expect(createJob).not.toHaveBeenCalled();
  });
});
