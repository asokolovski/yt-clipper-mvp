import { runCommandAndCaptureStdout } from "../process/run-command.js";

export async function getVideoDuration(youtubeUrl: string): Promise<number> {
  const stdout = await runCommandAndCaptureStdout("yt-dlp", [
    "--print",
    "duration",
    "--no-warnings",
    "--no-playlist",
    youtubeUrl,
  ]);

  const durationSeconds = Number(stdout.trim());

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("yt-dlp did not return a valid video duration.");
  }

  return durationSeconds;
}
