import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { createJob, getJob, type ClipSelectionMode, type Job } from "../api";
import { ClipOptionsForm } from "./ClipOptionsForm";
import { JobStatusCard } from "./JobStatusCard";
import "./HomePage.css";

const POLL_INTERVAL_MS = 5000;


function HomePage() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [clipSelectionMode, setClipSelectionMode] =
    useState<ClipSelectionMode>("sequential");
  const [requestedClipCount, setRequestedClipCount] = useState("3");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [createdJob, setCreatedJob] = useState<Job | null>(null);

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
    setErrorMessage("");

    const parsedRequestedClipCount = Number(requestedClipCount);

    if (
      clipSelectionMode === "ai" &&
      (!Number.isInteger(parsedRequestedClipCount) ||
        parsedRequestedClipCount < 1 ||
        parsedRequestedClipCount > 5)
    ) {
      setErrorMessage("For AI mode, requested clip count must be an integer from 1 to 5.");
      return;
    }

    setIsSubmitting(true);
    setCreatedJob(null);

    try {
      const job = await createJob({
        youtubeUrl,
        clipSelectionMode,
        requestedClipCount:
          clipSelectionMode === "ai" ? parsedRequestedClipCount : undefined,
      });
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


  return (
    <main className="home-page">
      <Link to="/jobs" className="jobs-link">
        View All Clips
      </Link>
      <div className="home-layout">
        <section className="home-card">
          <p className="home-eyebrow">YouTube Clipper MVP</p>
          <h1>Generate short clips from a YouTube URL.</h1>
          <p className="home-description">
            Paste a YouTube link below to start the clip generation workflow.
          </p>

          <form className="url-form" onSubmit={handleSubmit}>
            <div className="url-row">
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
            </div>
            <ClipOptionsForm
              clipSelectionMode={clipSelectionMode}
              requestedClipCount={requestedClipCount}
              onClipSelectionModeChange={setClipSelectionMode}
              onRequestedClipCountChange={setRequestedClipCount}
            />
          </form>

          {errorMessage ? <p className="form-message error-message">{errorMessage}</p> : null}

          {createdJob ? <JobStatusCard job={createdJob} label="Latest job started" /> : null}
        </section>

        <aside className="guide-card">
          <p className="home-eyebrow">Quick Guide</p>
          <h2 className="guide-title">How to use this page</h2>
          <div className="guide-steps">
            <p>
              <strong>1.</strong> Paste a YouTube URL into the main form.
            </p>
            <p>
              <strong>2.</strong> Choose AI or sequential clip selection.
            </p>
            <p>
              <strong>3.</strong> Generate the job, then expand the job card to preview clips.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default HomePage;
