import { ensureJobStorageDirs, getSourceVideoPath } from "../storage/paths.js";
import { runCommand } from "../process/run-command.js";

export type DownloadVideoInput = {
  jobId: string;
  youtubeUrl: string;
};

export type DownloadVideoResult = {
  sourceVideoPath: string;
};

export async function downloadVideo(
  input: DownloadVideoInput,
): Promise<DownloadVideoResult> {
  await ensureJobStorageDirs(input.jobId);

  const sourceVideoPath = getSourceVideoPath(input.jobId);

  await runCommand("yt-dlp", [
    "-f",
    "best[ext=mp4]/best",
    "-o",
    sourceVideoPath,
    input.youtubeUrl,
  ]);

  return {
    sourceVideoPath,
  };
}