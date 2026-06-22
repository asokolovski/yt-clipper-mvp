import { dbPool } from "./pool.js";

async function checkDatabaseConnection(): Promise<void> {
  try {
    const result = await dbPool.query<{
      databaseName: string;
      currentTime: Date;
    }>(
      `SELECT
        current_database() AS "databaseName",
        NOW() AS "currentTime"`,
    );

    const database = result.rows[0];

    if (!database) {
      throw new Error("PostgreSQL returned no connection-check result.");
    }

    console.log(
      `Connected to PostgreSQL database "${database.databaseName}" at ${database.currentTime.toISOString()}.`,
    );
  } finally {
    await dbPool.end();
  }
}

checkDatabaseConnection().catch((error: unknown) => {
  console.error("Database connection check failed:", error);
  process.exitCode = 1;
});
