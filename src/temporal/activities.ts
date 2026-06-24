import { getSubtitles } from "youtube-caption-extractor";

import { dbPool } from "../db/pool.js";

export type StoredTranscript = {
  source: "youtube_captions";
  segmentCount: number;
};

export async function markJobProcessing(jobId: string): Promise<void> {
  await updateJob(jobId, {
    status: "processing",
    errorMessage: null,
  });
}

export async function fetchAndStoreTranscript(
  jobId: string,
  youtubeUrl: string,
): Promise<StoredTranscript> {
  const videoId = getYouTubeVideoId(youtubeUrl);
  const subtitles = await getSubtitles({
    videoID: videoId,
    lang: "en",
  });

  if (subtitles.length === 0) {
    throw new Error(`No captions were found for YouTube video ${videoId}.`);
  }

  const transcriptText = subtitles
    .map(
      (segment) =>
        `[start=${segment.start}s duration=${segment.dur}s] ${segment.text}`,
    )
    .join("\n");

    console.log("Transcript fetched:", {
      jobId,
      segmentCount: subtitles.length,
      preview: transcriptText.slice(0, 500),
    });

  const result = await dbPool.query(
    `
      UPDATE jobs
      SET
        transcript_source = $1,
        transcript_text = $2,
        updated_at = NOW()
      WHERE id = $3
    `,
    ["youtube_captions", transcriptText, jobId],
  );

  if (result.rowCount !== 1) {
    throw new Error(`Could not save transcript because job ${jobId} was not found.`);
  }

  return {
    source: "youtube_captions",
    segmentCount: subtitles.length,
  };
}

export async function markJobFailed(
  jobId: string,
  errorMessage: string,
): Promise<void> {
  await updateJob(jobId, {
    status: "failed",
    errorMessage,
  });
}

function getYouTubeVideoId(youtubeUrl: string): string {
  const parsedUrl = new URL(youtubeUrl);
  const hostname = parsedUrl.hostname.replace(/^www\./, "");

  if (hostname === "youtube.com" && parsedUrl.pathname === "/watch") {
    const videoId = parsedUrl.searchParams.get("v");

    if (videoId) {
      return videoId;
    }
  }

  if (hostname === "youtu.be") {
    const videoId = parsedUrl.pathname.slice(1);

    if (videoId) {
      return videoId;
    }
  }

  throw new Error(`Could not find a YouTube video ID in URL: ${youtubeUrl}`);
}

async function updateJob(
  jobId: string,
  update: {
    status: "processing" | "failed";
    errorMessage: string | null;
  },
): Promise<void> {
  const result = await dbPool.query(
    `
      UPDATE jobs
      SET status = $1, error_message = $2, updated_at = NOW()
      WHERE id = $3
    `,
    [update.status, update.errorMessage, jobId],
  );

  if (result.rowCount !== 1) {
    throw new Error(`Could not update job ${jobId} because it was not found.`);
  }
}
