// src/rendering/ffmpeg.ts

import { getClipOutputPath } from "../storage/paths.js";
import { runCommand } from "../process/run-command.js";

export type RenderClipInput = {
  jobId: string;
  clipId: string;
  sourceVideoPath: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
};

export type RenderClipResult = {
  clipId: string;
  filePath: string;
};

export async function renderClip(
  input: RenderClipInput,
): Promise<RenderClipResult> {
  const filePath = getClipOutputPath(input.jobId, input.clipId);
  const durationSeconds = input.endTimeSeconds - input.startTimeSeconds;

  await runCommand("ffmpeg", [
    "-y",
    "-ss",
    String(input.startTimeSeconds),
    "-i",
    input.sourceVideoPath,
    "-t",
    String(durationSeconds),
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    filePath,
  ]);

  return {
    clipId: input.clipId,
    filePath,
  };
}
