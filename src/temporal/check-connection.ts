import { createTemporalClient } from "./client.js";

async function checkTemporalConnection(): Promise<void> {
  const { connection } = await createTemporalClient();

  try {
    console.log("Connected to Temporal successfully.");
  } finally {
    await connection.close();
  }
}

checkTemporalConnection().catch((error: unknown) => {
  console.error("Temporal connection check failed:", error);
  process.exitCode = 1;
});
