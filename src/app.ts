import express from "express";

import { dbPool } from "./db/pool.js";
import { getTemporalClient } from "./temporal/client.js";
import { CLIP_GENERATION_TASK_QUEUE } from "./temporal/constants.js";
import { generateClipsWorkflow } from "./temporal/workflows/generate-clips.js";

export const app = express();

app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/api/jobs", async (request, response) => {
  const youtubeUrl = request.body?.youtubeUrl;

  if (
    typeof youtubeUrl !== "string" ||
    youtubeUrl.trim() === "" ||
    !youtubeUrl.includes("youtube.com/watch?v=")
  ) {
    return response.status(400).json({
      error:
        "Valid youtubeUrl of the form youtube.com/watch?v=<video_id> is required",
    });
  }

  try {
    const result = await dbPool.query(
      `
        INSERT INTO jobs (youtube_url)
        VALUES ($1)
        RETURNING id, youtube_url, status, created_at
      `,
      [youtubeUrl.trim()],
    );

    const createdJob = result.rows[0];
    console.log("Created job:", createdJob);
    const workflowId = `clip-generation-${createdJob.id}`;
    const temporalClient = await getTemporalClient();

    await temporalClient.workflow.start(generateClipsWorkflow, {
      workflowId,
      taskQueue: CLIP_GENERATION_TASK_QUEUE,
      args: [
        {
          jobId: createdJob.id,
          youtubeUrl: createdJob.youtube_url,
        },
      ],
    });

    await dbPool.query(
      `
        UPDATE jobs
        SET workflow_id = $1, updated_at = NOW()
        WHERE id = $2
      `,
      [workflowId, createdJob.id],
    );

    return response.status(201).json({
      id: createdJob.id,
      workflowId,
      youtubeUrl: createdJob.youtube_url,
      status: createdJob.status,
      createdAt: createdJob.created_at,
    });
  } catch (error) {
    console.error("Failed to create job:", error);

    return response.status(500).json({
      error: "Failed to create job",
    });
  }
});

app.get("/api/jobs/:jobId", async (request, response) => {
  const { jobId } = request.params;

  try {
    const result = await dbPool.query(
      `
        SELECT
          id,
          workflow_id,
          youtube_url,
          status,
          error_message,
          created_at,
          updated_at
        FROM jobs
        WHERE id::text = $1
      `,
      [jobId],
    );

    if (result.rowCount === 0) {
      return response.status(404).json({ error: "Job not found" });
    }

    const job = result.rows[0];

    return response.json({
      id: job.id,
      workflowId: job.workflow_id,
      youtubeUrl: job.youtube_url,
      status: job.status,
      errorMessage: job.error_message,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    });
  } catch (error: unknown) {
    console.error("Failed to get job:", error);

    return response.status(500).json({ error: "Failed to get job" });
  }
});

app.get("/api/jobs/:jobId/transcript", async (request, response) => {
  const { jobId } = request.params;

  try {
    const result = await dbPool.query(
      `
        SELECT id, status, transcript_source, transcript_text
        FROM jobs
        WHERE id::text = $1
      `,
      [jobId],
    );

    if (result.rowCount === 0) {
      return response.status(404).json({ error: "Job not found" });
    }

    const job = result.rows[0];

    return response.json({
      jobId: job.id,
      status: job.status,
      transcriptSource: job.transcript_source,
      transcriptText: job.transcript_text,
    });
  } catch (error: unknown) {
    console.error("Failed to get job transcript:", error);

    return response
      .status(500)
      .json({ error: "Failed to get job transcript" });
  }
});

app.get("/api/jobs/:jobId/clips", async (request, response) => {
  const { jobId } = request.params;

  try {
    const jobResult = await dbPool.query(
      `
        SELECT id, status
        FROM jobs
        WHERE id::text = $1
      `,
    [jobId],
  );

    if (jobResult.rowCount === 0) {
      return response.status(404).json({ error: "Job not found" });
    }

    const clipsResult = await dbPool.query(
      `
        SELECT
          id,
          title,
          start_time_seconds,
          end_time_seconds,
          reason,
          status
        FROM clips
        WHERE job_id = $1
        ORDER BY start_time_seconds
      `,
    [jobId],
  );

    const job = jobResult.rows[0];

    return response.json({
      jobId: job.id,
      status: job.status,
      clips: clipsResult.rows.map((clip) => ({
        id: clip.id,
        title: clip.title,
        startTimeSeconds: clip.start_time_seconds,
        endTimeSeconds: clip.end_time_seconds,
        reason: clip.reason,
        status: clip.status,
      })),
  });
  } catch (error: unknown) {
    console.error("Failed to get job clips:", error);

    return response.status(500).json({ error: "Failed to get job clips" });
  }
});
