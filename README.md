# YouTube Clipper MVP

This project is a learning-focused MVP that turns a YouTube video into short clips.

Current high-level flow:

1. Send a YouTube URL to the backend.
2. Create a clip-generation job.
3. Start a Temporal workflow.
4. Fetch the transcript.
5. Choose clip timestamps with either AI or sequential splitting.
6. Download the source video.
7. Render MP4 clips with FFmpeg.
8. Save clip metadata in Postgres and files on local disk.

## Running The App

There are now two main ways to run this project.

### Option 1: Full Docker Compose

Goal:
Run the whole app in containers, including the frontend, API, worker, Postgres, and Temporal.

Use this when you want the easiest "clone and run" experience.

Steps:

1. Copy `.env.example` to `.env`
2. Fill in `LLM_API_KEY`
3. Run:

```bash
docker compose up --build
```

What starts:

- frontend at `http://localhost:8080`
- API at `http://localhost:3000`
- Temporal UI at `http://localhost:8233`
- Postgres
- Temporal
- a one-off migration container
- the Temporal worker

Notes:

- The frontend talks to the API through Nginx at `http://localhost:8080/api/...`
- The API is also exposed directly on `http://localhost:3000` for easier debugging
- Generated clip files are shared through a Docker-managed `clip_storage` volume
- If you want clip files in a real local folder for inspection, run `docker compose -f compose.yaml -f compose.dev.yaml up --build` to override that with `./storage:/app/storage`

### Option 2: Local App Dev + Compose For Infra

Goal:
Run the frontend, API, and worker directly on your machine, while still using Docker Compose for infrastructure services like Postgres and Temporal.

Use this when you want fast iteration with local TypeScript/Vite dev servers.

Yes, this mode still uses Docker Compose, but only for infrastructure.

Start the infrastructure:

```bash
docker compose up database temporal-database temporal temporal-ui
```

Then run the app pieces locally in separate terminals:

```bash
npm install
npm run db:migrate
npm run dev
```

```bash
npm run worker:dev
```

```bash
cd frontend
npm install
npm run dev
```

What runs where:

- frontend dev server on Vite
- backend API locally on `http://localhost:3000`
- worker locally
- Postgres in Docker on `localhost:5433`
- Temporal in Docker on `localhost:7233`

Important difference:

- Full Compose mode runs everything in containers
- Local dev mode runs only the infrastructure in containers, and the app code locally

### Which One Should You Use?

- Use full Compose when you want the simplest startup story
- Use local app dev when you want faster code-edit feedback while building features

## Current Endpoints

### `GET /health`

Simple health check.

Example:

```bash
curl http://localhost:3000/health
```

Example response:

```json
{
  "status": "ok"
}
```

### `POST /api/jobs`

Creates a new clip-generation job and starts the Temporal workflow.

AI example:

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "clipSelectionMode": "ai",
    "requestedClipCount": 3
  }'
```

Sequential example:

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "clipSelectionMode": "sequential"
  }'
```

Example response:

```json
{
  "id": "job-id",
  "workflowId": "clip-generation-job-id",
  "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "clipSelectionMode": "sequential",
  "requestedClipCount": 1,
  "status": "queued",
  "createdAt": "2026-07-02T12:00:00.000Z"
}
```

Note:
- AI mode currently requires `requestedClipCount`
- Sequential mode does not require it from the caller

### `GET /api/jobs`

Lists all jobs.

Example:

```bash
curl http://localhost:3000/api/jobs
```

### `GET /api/jobs/:jobId`

Returns one job.

Example:

```bash
curl http://localhost:3000/api/jobs/job-id
```

### `GET /api/jobs/:jobId/transcript`

Returns the stored transcript for a job.

Example:

```bash
curl http://localhost:3000/api/jobs/job-id/transcript
```

### `GET /api/jobs/:jobId/clips`

Returns the clips selected or rendered for a job.

Example:

```bash
curl http://localhost:3000/api/jobs/job-id/clips
```

### `GET /api/clips/:clipId/stream`

Streams a completed clip file.

Example:

```bash
curl http://localhost:3000/api/clips/clip-id/stream
```

### `GET /api/jobs/:jobId/download`

Downloads all completed clips for a job as one zip archive.

Example:

```bash
curl -L http://localhost:3000/api/jobs/job-id/download --output clips.zip
```

## AI vs Sequential

There are currently two clip-selection strategies.

### `ai`

AI mode uses:
- the transcript text
- the transcript end time
- the full video duration

The backend sends that information to an LLM and asks it to return timestamped clip suggestions.

Use this when you want:
- highlight clips
- stronger hooks
- more curated short-form moments

### `sequential`

Sequential mode does not ask the LLM to pick highlights.

Instead, it:
- gets the full video duration with `yt-dlp`
- splits the video into ordered 60-second chunks
- covers the whole video from start to finish

Use this when you want:
- a full breakdown of the video
- predictable chunking
- no AI judgment about “best moments”

## Small Design Overview

This codebase already shows a few useful design ideas that are worth learning from.

### Single Responsibility Principle

Some parts of the app now have clearer responsibilities:

- `clip-selection/*` decides how clip timestamps are chosen
- `llm/*` handles LLM provider details
- Temporal activities coordinate real-world work
- workflows orchestrate steps, but do not perform outside-world work directly

Examples:
- [src/clip-selection/llm-clip-selector.ts](/home/alexei/projects/yt-clipper-mvp/src/clip-selection/llm-clip-selector.ts:1)
- [src/clip-selection/sequential-clip-selector.ts](/home/alexei/projects/yt-clipper-mvp/src/clip-selection/sequential-clip-selector.ts:1)
- [src/llm/openai-llm-client.ts](/home/alexei/projects/yt-clipper-mvp/src/llm/openai-llm-client.ts:1)

### Open/Closed Principle

The app is more open to extension now:

- new clip-selection strategies can be added by implementing `ClipSelector`
- new LLM providers can be added by implementing `LlmClient`

That means we can add behavior without rewriting the rest of the app.

Examples:
- [src/clip-selection/types.ts](/home/alexei/projects/yt-clipper-mvp/src/clip-selection/types.ts:1)
- [src/llm/types.ts](/home/alexei/projects/yt-clipper-mvp/src/llm/types.ts:1)

### Dependency Inversion Principle

Higher-level app logic depends on abstractions, not directly on OpenAI.

For example:
- `LlmClipSelector` depends on `LlmClient`
- the app chooses a `ClipSelector`
- `OpenAiLlmClient` is only one concrete implementation underneath

That makes the app easier to swap, test, and reason about.

### Interface Segregation, Lightly

The interfaces are small on purpose:

- `ClipSelector` only needs `selectClips(...)`
- `LlmClient` only needs `generateText(...)`

That keeps each abstraction easier to understand as a beginner.

## Current Mental Model

- Temporal workflow = the recipe
- Temporal activities = the real work
- Postgres = metadata storage
- local disk = MP4 files
- `ClipSelector` = clip-planning strategy
- `LlmClient` = LLM provider adapter

## What Temporal Gives Us

Temporal is what makes the clip-generation process more durable than a normal single request handler.

In this app, that matters because clip generation includes slow and failure-prone work:

- fetching transcripts
- calling an LLM
- downloading video
- rendering clips with FFmpeg

Temporal helps with that in a few important ways:

### Durable Workflow State

The workflow does not forget where it was just because the server process stops.

If the worker restarts, Temporal can continue the workflow from the last recorded step instead of starting the whole job from scratch.

### Retries for Activities

Activities are the parts that touch the outside world.

If one fails because of a temporary issue, Temporal can retry it automatically based on the retry policy in the workflow.

That is useful for things like:

- transient network failures
- temporary LLM errors
- occasional download issues

### Clear Separation Between Orchestration and Work

The workflow code describes the order of steps.

The activities perform the actual side effects.

That separation makes the app easier to reason about and is one of the main reasons Temporal fits this project well.

### Faster API Requests

The API can create a job and start the workflow quickly without waiting for the full clip-generation process to finish inside the request handler.

That means the user gets a fast response while the durable background process continues.

### Better Recovery Story

Without Temporal, a server crash during FFmpeg rendering or during an LLM call would usually leave you to manually figure out what happened.

With Temporal, the system has a clearer memory of:

- which workflow was running
- which step failed
- which activity can be retried

That makes the MVP much more reliable even before adding a lot of extra infrastructure.

## Good Next Learning Steps

- Make `requested_clip_count` nullable for sequential jobs
- Add a real backend endpoint contract for mode-specific requests
- Add another LLM provider behind `LlmClient`
- Add tests around clip-selection behavior
test