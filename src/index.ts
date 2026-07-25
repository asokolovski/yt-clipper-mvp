import { createApp } from "./app.js";
import { ClipService } from "./clip-management/clip-service.js";
import { PostgresClipRepository } from "./clip-management/postgres-clip-repository.js";
import { dbPool } from "./db/pool.js";
import { JobService } from "./jobs/job-service.js";
import { PostgresJobRepository } from "./jobs/postgres-job-repository.js";
import { TemporalWorkflowStarter } from "./jobs/workflow-starter.js";

const parsedPort = Number(process.env.PORT);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000;

const jobRepository = new PostgresJobRepository(dbPool);
const clipRepository = new PostgresClipRepository(dbPool);
const workflowStarter = new TemporalWorkflowStarter();

const jobService = new JobService(jobRepository, workflowStarter);
const clipService = new ClipService(clipRepository);

const app = createApp({
  jobService,
  clipService,
});

app.listen(port, () => {
  console.log(`API server is running at http://localhost:${port}`);
});
