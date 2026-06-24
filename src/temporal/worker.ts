import { NativeConnection, Worker } from "@temporalio/worker";

import { getRequiredEnvironmentVariable } from "../config/env.js";
import * as activities from "./activities.js";
import { CLIP_GENERATION_TASK_QUEUE } from "./constants.js";

async function runWorker(): Promise<void> {
  const connection = await NativeConnection.connect({
    address: getRequiredEnvironmentVariable("TEMPORAL_ADDRESS"),
  });

  try {
    const worker = await Worker.create({
      connection,
      namespace: "default",
      taskQueue: CLIP_GENERATION_TASK_QUEUE,
      activities,
      workflowsPath: new URL(
        "./workflows/generate-clips.ts",
        import.meta.url,
      ).pathname,
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
