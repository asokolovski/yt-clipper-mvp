import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";

import * as archiver from "archiver";
import express from "express";

import type { ClipSelectionMode } from "./clip-selection/types.js";
import type { ClipsService } from "./clip-management/clip-service.js";
import type { JobsService } from "./jobs/job-service.js";

export type AppDependencies = {
  jobService: JobsService;
  clipService: ClipsService;
};

export function createApp({
  jobService,
  clipService,
}: AppDependencies): express.Express {
  const app = express();

  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.get("/api/jobs", async (_request, response) => {
    try {
      const jobs = await jobService.listJobs();

      return response.json({ jobs });
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
      const createdJob = await jobService.createJob({
        youtubeUrl: youtubeUrl.trim(),
        clipSelectionMode,
        requestedClipCount: validatedRequestedClipCount,
      });

      return response.status(201).json(createdJob);
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
      const job = await jobService.getJob(jobId);

      if (job === null) {
        return response.status(404).json({ error: "Job not found" });
      }

      return response.json(job);
    } catch (error: unknown) {
      console.error("Failed to get job:", error);

      return response.status(500).json({ error: "Failed to get job" });
    }
  });

  app.get("/api/jobs/:jobId/transcript", async (request, response) => {
    const { jobId } = request.params;

    try {
      const transcript = await jobService.getJobTranscript(jobId);

      if (transcript === null) {
        return response.status(404).json({ error: "Job not found" });
      }

      return response.json(transcript);
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
      const job = await jobService.getJobStatus(jobId);

      if (job === null) {
        return response.status(404).json({ error: "Job not found" });
      }

      const clips = await clipService.listClipsForJob(jobId);

      return response.json({
        jobId: job.id,
        status: job.status,
        clips,
      });
    } catch (error: unknown) {
      console.error("Failed to get job clips:", error);

      return response.status(500).json({ error: "Failed to get job clips" });
    }
  });

  app.get("/api/clips/:clipId/stream", async (request, response) => {
    const clip = await getCompletedClipById(
      clipService,
      request.params.clipId,
      response,
    );

    if (clip === null) {
      return;
    }

    return response.sendFile(clip.absoluteFilePath);
  });

  app.get("/api/jobs/:jobId/download", async (request, response) => {
    const clips = await getCompletedClipsByJobId(
      jobService,
      clipService,
      request.params.jobId,
      response,
    );

    if (clips === null) {
      return;
    }

    response.setHeader("Content-Type", "application/zip");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${createJobDownloadFileName(request.params.jobId)}"`,
    );

    const archive = new archiver.ZipArchive({ zlib: { level: 9 } });

    archive.on("error", (error: Error) => {
      console.error("Failed to create job download archive:", error);

      if (!response.headersSent) {
        response.status(500).json({ error: "Failed to create job download" });
        return;
      }

      response.end();
    });

    archive.pipe(response);

    clips.forEach((clip, index) => {
      archive.append(createReadStream(clip.absoluteFilePath), {
        name: `${String(index + 1).padStart(2, "0")}-${createDownloadFileName(clip.title)}.mp4`,
      });
    });

    await archive.finalize();
  });

  return app;
}

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

function createJobDownloadFileName(jobId: string): string {
  return `job-${jobId}-clips.zip`;
}

async function getCompletedClipById(
  clipService: ClipsService,
  clipId: string,
  response: express.Response,
): Promise<{ absoluteFilePath: string; title: string } | null> {
  try {
    const clip = await clipService.getClipFileRecord(clipId);

    if (clip === null) {
      response.status(404).json({ error: "Clip not found" });
      return null;
    }

    if (clip.status !== "completed") {
      response.status(409).json({
        error: "Clip is not ready yet",
      });
      return null;
    }

    if (typeof clip.filePath !== "string" || clip.filePath.trim() === "") {
      response.status(404).json({
        error: "Clip file path was not found",
      });
      return null;
    }

    const absoluteFilePath = path.resolve(clip.filePath);

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

async function getCompletedClipsByJobId(
  jobService: JobsService,
  clipService: ClipsService,
  jobId: string,
  response: express.Response,
): Promise<Array<{ absoluteFilePath: string; title: string }> | null> {
  try {
    const job = await jobService.getJobStatus(jobId);

    if (job === null) {
      response.status(404).json({ error: "Job not found" });
      return null;
    }

    const clips = await clipService.listCompletedClipFileRecords(jobId);

    if (clips.length === 0) {
      response.status(409).json({
        error: "No completed clips are ready to download yet",
      });
      return null;
    }

    const completedClips: Array<{ absoluteFilePath: string; title: string }> =
      [];

    for (const clip of clips) {
      if (typeof clip.filePath !== "string" || clip.filePath.trim() === "") {
        response.status(404).json({
          error: `Clip file path was not found for clip ${clip.id}`,
        });
        return null;
      }

      const absoluteFilePath = path.resolve(clip.filePath);

      try {
        await access(absoluteFilePath);
      } catch {
        response.status(404).json({
          error: `Clip file was not found on disk for clip ${clip.id}`,
        });
        return null;
      }

      completedClips.push({
        absoluteFilePath,
        title: clip.title,
      });
    }

    return completedClips;
  } catch (error: unknown) {
    console.error("Failed to load job clips for download:", error);
    response.status(500).json({ error: "Failed to load job clips" });
    return null;
  }
}
