import path from "node:path";
import { fileURLToPath } from "node:url";

import { NativeConnection, Worker } from "@temporalio/worker";

import { getRequiredEnvironmentVariable } from "../config/env.js";
import * as activities from "./activities.js";
import { CLIP_GENERATION_TASK_QUEUE } from "./constants.js";

async function runWorker(): Promise<void> {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentFileExtension = path.extname(currentFilePath);
  const workflowsPath = fileURLToPath(
    new URL(`./workflows/generate-clips${currentFileExtension}`, import.meta.url),
  );

  const connection = await NativeConnection.connect({
    address: getRequiredEnvironmentVariable("TEMPORAL_ADDRESS"),
  });

  try {
    const worker = await Worker.create({
      connection,
      namespace: "default",
      taskQueue: CLIP_GENERATION_TASK_QUEUE,
      activities,
      workflowsPath,
    });

    await worker.run();
  } finally {
    await connection.close();
  }
}

runWorker().catch((error: unknown) => {
  console.error("Temporal worker failed:", error);
  process.exitCode = 1;
});
