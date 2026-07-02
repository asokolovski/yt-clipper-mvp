import { access } from "node:fs/promises";
import path from "node:path";

import express from "express";

import type { ClipSelectionMode } from "./clip-selection/types.js";
import { dbPool } from "./db/pool.js";
import { getTemporalClient } from "./temporal/client.js";
import { CLIP_GENERATION_TASK_QUEUE } from "./temporal/constants.js";
import { generateClipsWorkflow } from "./temporal/workflows/generate-clips.js";

export const app = express();

app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/jobs", async (_request, response) => {
  try {
    const result = await dbPool.query(
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

    return response.json({
      jobs: result.rows.map((job) => ({
        id: job.id,
        workflowId: job.workflow_id,
        youtubeUrl: job.youtube_url,
        clipSelectionMode: job.clip_selection_mode,
        requestedClipCount: job.requested_clip_count,
        status: job.status,
        errorMessage: job.error_message,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
      })),
    });
  } catch (error: unknown) {
    console.error("Failed to list jobs:", error);

    return response.status(500).json({ error: "Failed to list jobs" });
  }
});

app.post("/api/jobs", async (request, response) => {
  const youtubeUrl = request.body?.youtubeUrl;
  const clipSelectionMode = request.body?.clipSelectionMode;
  const requestedClipCount = request.body?.requestedClipCount;

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

  if (clipSelectionMode !== "ai" && clipSelectionMode !== "sequential") {
    return response.status(400).json({
      error: "clipSelectionMode must be either 'ai' or 'sequential'",
    });
  }

  const validatedRequestedClipCount = getValidatedRequestedClipCount({
    clipSelectionMode,
    requestedClipCount,
  });

  if (validatedRequestedClipCount instanceof Error) {
    return response.status(400).json({
      error: validatedRequestedClipCount.message,
    });
  }

  try {
    const result = await dbPool.query(
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
        youtubeUrl.trim(),
        clipSelectionMode,
        validatedRequestedClipCount,
      ],
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
      clipSelectionMode: createdJob.clip_selection_mode as ClipSelectionMode,
      requestedClipCount: createdJob.requested_clip_count,
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

function getValidatedRequestedClipCount(input: {
  clipSelectionMode: ClipSelectionMode;
  requestedClipCount: unknown;
}): number | Error {
  if (input.clipSelectionMode === "sequential") {
    // Sequential mode ignores clip count and splits the whole video into
    // fixed-length parts, but the current schema still requires a number.
    return 1;
  }

  if (
    typeof input.requestedClipCount !== "number" ||
    !Number.isInteger(input.requestedClipCount)
  ) {
    return new Error("requestedClipCount must be an integer for AI mode.");
  }

  if (input.requestedClipCount < 1 || input.requestedClipCount > 5) {
    return new Error("AI mode supports between 1 and 5 clips.");
  }

  return input.requestedClipCount;
}

app.get("/api/jobs/:jobId", async (request, response) => {
  const { jobId } = request.params;

  try {
    const result = await dbPool.query(
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

    if (result.rowCount === 0) {
      return response.status(404).json({ error: "Job not found" });
    }

    const job = result.rows[0];

    return response.json({
      id: job.id,
      workflowId: job.workflow_id,
      youtubeUrl: job.youtube_url,
      clipSelectionMode: job.clip_selection_mode,
      requestedClipCount: job.requested_clip_count,
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
          status,
          file_path
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
        filePath: clip.file_path,
      })),
    });
  } catch (error: unknown) {
    console.error("Failed to get job clips:", error);

    return response.status(500).json({ error: "Failed to get job clips" });
  }
});

app.get("/api/clips/:clipId/stream", async (request, response) => {
  const clip = await getCompletedClipById(request.params.clipId, response);

  if (clip === null) {
    return;
  }

  return response.sendFile(clip.absoluteFilePath);
});

app.get("/api/clips/:clipId/download", async (request, response) => {
  const clip = await getCompletedClipById(request.params.clipId, response);

  if (clip === null) {
    return;
  }

  return response.download(
    clip.absoluteFilePath,
    `${createDownloadFileName(clip.title)}.mp4`,
  );
});

function createDownloadFileName(title: unknown): string {
  if (typeof title !== "string") {
    return "clip";
  }

  const cleanedTitle = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (cleanedTitle === "") {
    return "clip";
  }

  return cleanedTitle;
}

async function getCompletedClipById(
  clipId: string,
  response: express.Response,
): Promise<{ absoluteFilePath: string; title: string } | null> {
  try {
    const result = await dbPool.query(
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

    if (result.rowCount === 0) {
      response.status(404).json({ error: "Clip not found" });
      return null;
    }

    const clip = result.rows[0];

    if (clip.status !== "completed") {
      response.status(409).json({
        error: "Clip is not ready yet",
      });
      return null;
    }

    if (typeof clip.file_path !== "string" || clip.file_path.trim() === "") {
      response.status(404).json({
        error: "Clip file path was not found",
      });
      return null;
    }

    const absoluteFilePath = path.resolve(clip.file_path);

    try {
      await access(absoluteFilePath);
    } catch {
      response.status(404).json({
        error: "Clip file was not found on disk",
      });
      return null;
    }

    return {
      absoluteFilePath,
      title: clip.title,
    };
  } catch (error: unknown) {
    console.error("Failed to load clip file:", error);
    response.status(500).json({ error: "Failed to load clip file" });
    return null;
  }
}
