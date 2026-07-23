import { heartbeat } from "@temporalio/activity";
import { getSubtitles } from "youtube-caption-extractor";

import type {
  ClipSelectionMode,
  SelectedClip,
} from "../clip-selection/types.js";
import { createClipSelector } from "../clip-selection/create-clip-selector.js";
import { dbPool } from "../db/pool.js";

import { downloadVideo } from "../video/download-video.js";
import { getVideoDuration } from "../video/get-video-duration.js";
import { renderClip } from "../rendering/ffmpeg.js";

export type StoredTranscript = {
  source: "youtube_captions";
  segmentCount: number;
};

export type ClipSelectionResult = {
  clips: SelectedClip[];
};

export type StoredClip = SelectedClip & {
  id: string;
};


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

export async function selectClipTimestamps(
  jobId: string,
): Promise<ClipSelectionResult> {
  const result = await dbPool.query(
    `
      SELECT transcript_text, youtube_url, clip_selection_mode, requested_clip_count
      FROM jobs
      WHERE id = $1
    `,
    [jobId],
  );

  if (result.rowCount !== 1) {
    throw new Error(
      `Could not select clips because job ${jobId} was not found.`,
    );
  }

  const transcriptText = result.rows[0].transcript_text;
  const youtubeUrl = result.rows[0].youtube_url;
  const clipSelectionMode = result.rows[0]
    .clip_selection_mode as ClipSelectionMode;
  const requestedClipCount = Number(result.rows[0].requested_clip_count);

  if (typeof transcriptText !== "string" || transcriptText.trim() === "") {
    throw new Error(
      `Could not select clips because job ${jobId} has no transcript.`,
    );
  }

  const transcriptEndTimeSeconds = getTranscriptEndTimeSeconds(transcriptText);
  const videoDurationSeconds = await getVideoDuration(youtubeUrl);
  const clipSelector = createClipSelector(clipSelectionMode);
  const suggestions = await clipSelector.selectClips({
    transcript: transcriptText,
    transcriptEndTimeSeconds,
    videoDurationSeconds,
    requestedClipCount,
  });

  return {
    clips: suggestions.map((suggestion) =>
      validateClipSuggestion(suggestion, videoDurationSeconds, clipSelectionMode),
    ),
  };
}

export async function storeClipSelections(
  jobId: string,
  clips: SelectedClip[],
): Promise<StoredClip[]> {
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM clips WHERE job_id = $1", [jobId]);

    const storedClips: StoredClip[] = [];

    for (const clip of clips) {
      const results = await client.query(
        `
          INSERT INTO clips (
            job_id,
            title,
            start_time_seconds,
            end_time_seconds,
            reason
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `,
        [
          jobId,
          clip.title,
          clip.startTimeSeconds,
          clip.endTimeSeconds,
          clip.reason,
        ],
      );

      storedClips.push({
        ...clip,
        id: results.rows[0].id,
      });
    }

    await client.query("COMMIT");
    return storedClips;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function downloadVideoActivity(
  jobId: string,
  youtubeUrl: string,
): Promise<{ sourceVideoPath: string }> {
  return withHeartbeats(
    { phase: "downloading", jobId },
    () => downloadVideo({ jobId, youtubeUrl }),
  );
}

export async function renderClipsActivity(
  jobId: string,
  sourceVideoPath: string,
  clips: StoredClip[],
): Promise<void> {
  return withHeartbeats({ phase: "rendering", jobId }, async () => {
    for (const clip of clips) {
      await dbPool.query(
        `
          UPDATE clips
          SET
            status = 'rendering',
            updated_at = NOW()
          WHERE id = $1
        `,
        [clip.id],
      );

      try {
        const renderedClip = await renderClip({
          jobId,
          clipId: clip.id,
          sourceVideoPath,
          startTimeSeconds: clip.startTimeSeconds,
          endTimeSeconds: clip.endTimeSeconds,
        });

        await dbPool.query(
          `
            UPDATE clips
            SET
              file_path = $1,
              status = 'completed',
              updated_at = NOW()
            WHERE id = $2
          `,
          [renderedClip.filePath, renderedClip.clipId],
        );
      } catch (error: unknown) {
        await dbPool.query(
          `
            UPDATE clips
            SET
              status = 'failed',
              updated_at = NOW()
            WHERE id = $1
          `,
          [clip.id],
        );

        throw error;
      }
    }
  });
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

export async function markJobCompleted(jobId: string) : Promise<void> {
  await updateJob(jobId, {
    status: "completed", 
    errorMessage: null
  });
}

export async function markJobProcessing(jobId: string): Promise<void> {
  await updateJob(jobId, {
    status: "processing",
    errorMessage: null,
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

function getTranscriptEndTimeSeconds(transcriptText: string): number {
  // lastIndexOf searches backward and finds the final caption's start marker.
  const lastCaptionIndex = transcriptText.lastIndexOf("[start=");

  if (lastCaptionIndex === -1) {
    throw new Error(
      "Could not find a caption timestamp in the transcript.",
    );
  }

  const startTimeSeconds = readSecondsAfterLabel(
    transcriptText,
    "[start=",
    lastCaptionIndex,
  );
  const durationSeconds = readSecondsAfterLabel(
    transcriptText,
    "duration=",
    lastCaptionIndex,
  );

  return startTimeSeconds + durationSeconds;
}

function readSecondsAfterLabel(
  text: string,
  label: string,
  searchFromIndex: number,
): number {
  const labelIndex = text.indexOf(label, searchFromIndex);

  if (labelIndex === -1) {
    throw new Error(`Could not find ${label} in the final caption.`);
  }

  const numberStartIndex = labelIndex + label.length;
  const secondsLetterIndex = text.indexOf("s", numberStartIndex);

  if (secondsLetterIndex === -1) {
    throw new Error(`Could not read the number after ${label}.`);
  }

  const numberText = text.slice(numberStartIndex, secondsLetterIndex);
  const seconds = Number(numberText);

  if (!Number.isFinite(seconds)) {
    throw new Error(`The value after ${label} is not a valid number.`);
  }

  return seconds;
}

function validateClipSuggestion(
  clip: SelectedClip,
  videoDurationSeconds: number,
  clipSelectionMode: ClipSelectionMode = "ai",
): SelectedClip {
  const title = clip.title.trim();
  const reason = clip.reason.trim();
  const durationSeconds = clip.endTimeSeconds - clip.startTimeSeconds;

  if (title === "" || reason === "") {
    throw new Error("The LLM returned a clip with an empty title or reason.");
  }

  if (
    clipSelectionMode === "ai" &&
    (clip.startTimeSeconds < 0 || clip.endTimeSeconds > videoDurationSeconds)
  ) {
    throw new Error("The LLM returned a clip outside the video duration.");
  }

  if (clipSelectionMode === "ai" && (durationSeconds < 20 || durationSeconds > 60)) {
    throw new Error("The LLM returned a clip that is not 20 to 60 seconds long.");
  }

  return {
    ...clip,
    title,
    reason,
  };
}

async function updateJob(
  jobId: string,
  update: {
    status: "processing" | "failed" | "completed";
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

async function withHeartbeats<T>(
  details: object,
  operation: () => Promise<T>,
): Promise<T> {
  heartbeat(details);

  const timer = setInterval(() => {
    heartbeat(details);
  }, 10_000);

  try {
    return await operation();
  } finally {
    clearInterval(timer);
  }
}
