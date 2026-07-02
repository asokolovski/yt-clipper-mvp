import type {
  ClipSelectionInput,
  ClipSelector,
  SelectedClip,
} from "./types.js";

export class SequentialClipSelector implements ClipSelector {
  async selectClips(input: ClipSelectionInput): Promise<SelectedClip[]> {
    const clipLengthSeconds = 60;
    const numClips = Math.ceil(input.videoDurationSeconds / clipLengthSeconds);
    const clips: SelectedClip[] = [];

    for (
      let clipIndex = 0;
      clipIndex < numClips;
      clipIndex += 1
    ) {
      const startTimeSeconds = clipIndex * clipLengthSeconds;

      if (startTimeSeconds >= input.videoDurationSeconds) {
        break;
      }

      const endTimeSeconds = Math.min(
        startTimeSeconds + clipLengthSeconds,
        input.videoDurationSeconds,
      );

      clips.push({
        title: `Part ${clipIndex + 1}`,
        startTimeSeconds,
        endTimeSeconds,
        reason: "Sequential split of the full video.",
      });
    }

    if (clips.length === 0) {
      throw new Error("Could not create sequential clips from this video.");
    }

    return clips;
  }
}
