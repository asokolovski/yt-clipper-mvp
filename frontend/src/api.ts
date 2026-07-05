export type ClipSelectionMode = "ai" | "sequential";

export type Job = {
  id: string;
  workflowId: string | null;
  youtubeUrl: string;
  clipSelectionMode: ClipSelectionMode;
  requestedClipCount: number;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type CreateJobRequest = {
  youtubeUrl: string;
  clipSelectionMode: ClipSelectionMode;
  requestedClipCount?: number;
};

export type Clip = {
  id: string;
  title: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  reason: string;
  status: string;
  filePath: string;
};

type ClipsResponse =
  | {
      jobId: string;
      status: string;
      clips: Clip[];
    }
  | { error: string };

type TranscriptResponse =
  | {
      jobId: string;
      status: string;
      transcriptSource: string | null;
      transcriptText: string | null;
    }
  | { error: string };

type JobResponse = Job | { error: string };
type JobsResponse = { jobs: Job[] } | { error: string };

export async function createJob(request: CreateJobRequest): Promise<Job> {
  const response = await fetch("/api/jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
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

export async function getClips(jobId: string): Promise<Clip[]> {
  const response = await fetch(`/api/jobs/${jobId}/clips`);
  const data = (await response.json()) as ClipsResponse;

  if ("error" in data) {
    throw new Error(data.error);
  }

  return data.clips;
}

export async function getTranscript(jobId: string): Promise<string | null> {
  const response = await fetch(`/api/jobs/${jobId}/transcript`);
  const data = (await response.json()) as TranscriptResponse;

  if ("error" in data) {
    throw new Error(data.error);
  }

  return data.transcriptText;
}
