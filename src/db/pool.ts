import pg from "pg";

import { getRequiredEnvironmentVariable } from "../config/env.js";

const { Pool } = pg;

export const dbPool = new Pool({
  connectionString: getRequiredEnvironmentVariable("DATABASE_URL"),
});
