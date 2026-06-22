import express from "express";
import { dbPool } from "./db/pool.js";

export const app = express();

app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/api/jobs", async (request, response) => {
  const youtubeUrl = request.body?.youtubeUrl;

  if (typeof youtubeUrl !== "string" || youtubeUrl.trim() === "") {
    return response.status(400).json({
      error: "youtubeUrl is required",
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

    return response.status(201).json({
      id: createdJob.id,
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

