import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { createJob, getJob, type Job } from "../api";
import { JobStatusCard } from "./JobStatusCard";
import "./HomePage.css";

const POLL_INTERVAL_MS = 5000;

const MOCK_JOB: Job = {
  id: "51ea1a36-fd5c-4420-9bc5-3e86f574b353",
  workflowId: "clip-generation-51ea1a36-fd5c-4420-9bc5-3e86f574b353",
  youtubeUrl: "https://www.youtube.com/watch?v=TG6XSFeOT3g",
  status: "completed",
  errorMessage: null,
  createdAt: "2026-06-27T23:09:26.238Z",
  updatedAt: "2026-06-27T23:09:47.802Z",
};

function HomePage() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [createdJob, setCreatedJob] = useState<Job | null>(MOCK_JOB);

  useEffect(() => {
    document.title = "Create Clips | YouTube Clipper MVP";
  }, []);

  useEffect(() => {
    if (
      createdJob === null ||
      (createdJob.status !== "queued" && createdJob.status !== "processing")
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshJob(createdJob.id);
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [createdJob]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setCreatedJob(null);

    try {
      const job = await createJob(youtubeUrl);
      setCreatedJob(job);
      setYoutubeUrl("");
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Failed to create job");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshJob = async (jobId: string) => {
    try {
      const latestJob = await getJob(jobId);
      setCreatedJob(latestJob);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Failed to load job");
      }
    }
  };

  return (
    <main className="home-page">
      <Link to="/jobs" className="jobs-link">
        View All Clips
      </Link>
      <section className="home-card">
        <p className="home-eyebrow">YouTube Clipper MVP</p>
        <h1>Generate short clips from a YouTube URL.</h1>
        <p className="home-description">
          Paste a YouTube link below to start the clip generation workflow.
        </p>

        <form className="url-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="youtube-url">
            YouTube URL
          </label>
          <input
            id="youtube-url"
            className="url-input"
            type="text"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
            required
          />
          <button className="generate-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Generating..." : "Generate"}
          </button>
        </form>

        {errorMessage ? <p className="form-message error-message">{errorMessage}</p> : null}

        {createdJob ? <JobStatusCard job={createdJob} /> : null}
      </section>
    </main>
  );
}

export default HomePage;
