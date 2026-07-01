import { log, proxyActivities } from "@temporalio/workflow";

import type * as activities from "../activities.js";

const {
  fetchAndStoreTranscript,
  markJobFailed,
  markJobProcessing,
  markJobCompleted,
  storeClipSelections,
} =
  proxyActivities<typeof activities>({
    startToCloseTimeout: "1 minute",
    retry: {
      initialInterval: "2 seconds",
      backoffCoefficient: 2,
      maximumAttempts: 3,
    },
  });

const { selectClipTimestamps } = proxyActivities<typeof activities>({
  startToCloseTimeout: "3 minutes",
  retry: {
    initialInterval: "2 seconds",
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

const {
  downloadVideoActivity,
  renderClipsActivity,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "15 minutes",
  retry: {
    initialInterval: "5 seconds",
    backoffCoefficient: 2,
    maximumAttempts: 2,
  },
});

export type GenerateClipsInput = {
  jobId: string;
  youtubeUrl: string;
};

export async function generateClipsWorkflow(
  input: GenerateClipsInput,
): Promise<void> {
  log.info("Clip generation workflow started", {
    jobId: input.jobId,
    youtubeUrl: input.youtubeUrl,
  });

  await markJobProcessing(input.jobId);

  try {
    const transcript = await fetchAndStoreTranscript(
      input.jobId,
      input.youtubeUrl,
    );

    log.info("YouTube transcript stored", {
      jobId: input.jobId,
      transcriptSource: transcript.source,
      transcriptSegmentCount: transcript.segmentCount,
    });

    const clipSelection = await selectClipTimestamps(input.jobId);
    const storedClips = await storeClipSelections(input.jobId, clipSelection.clips);

    log.info("Clip timestamps selected and stored", {
      jobId: input.jobId,
      clipCount: clipSelection.clips.length,
    });

    const downloadedVideo = await downloadVideoActivity(input.jobId, input.youtubeUrl);

    await renderClipsActivity(input.jobId, downloadedVideo.sourceVideoPath, storedClips);
    await markJobCompleted(input.jobId);
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);

    await markJobFailed(input.jobId, errorMessage);

    throw error;
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown clip-generation error.";
}
