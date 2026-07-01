export type Job = {
  id: string;
  workflowId: string | null;
  youtubeUrl: string;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string;
};

type JobResponse = Job | { error: string };
type JobsResponse = { jobs: Job[] } | { error: string };

export async function createJob(youtubeUrl: string): Promise<Job> {
  const response = await fetch("/api/jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      youtubeUrl,
    }),
  });

  const data = (await response.json()) as JobResponse;

  if ("error" in data) {
    throw new Error(data.error);
  }

  return data;
}

export async function getJob(jobId: string): Promise<Job> {
  const response = await fetch(`/api/jobs/${jobId}`);
  const data = (await response.json()) as JobResponse;

  if ("error" in data) {
    throw new Error(data.error);
  }

  return data;
}

export async function getJobs(): Promise<Job[]> {
  const response = await fetch("/api/jobs");
  const data = (await response.json()) as JobsResponse;

  if ("error" in data) {
    throw new Error(data.error);
  }

  return data.jobs;
} 
