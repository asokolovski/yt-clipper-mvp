import path from "node:path";
import { mkdir } from "node:fs/promises";

const STORAGE_ROOT = "storage";

export function getJobStorageDir(jobId: string): string {
  return path.join(STORAGE_ROOT, "jobs", jobId);
}

export function getSourceVideoPath(jobId: string): string {
  return path.join(getJobStorageDir(jobId), "source.mp4");
}

export function getClipOutputPath(jobId: string, clipId: string): string {
  return path.join(getJobStorageDir(jobId), "clips", `${clipId}.mp4`);
}

export async function ensureJobStorageDirs(jobId: string): Promise<void> {
  await mkdir(path.join(getJobStorageDir(jobId), "clips"), {
    recursive: true,
  });
}