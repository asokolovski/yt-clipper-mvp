import { useState } from "react";
import type { Clip, Job } from "../api";
import { getClips, getTranscript } from "../api";
import { JobClipsPanel } from "./JobClipsPanel";
import { JobTranscriptPanel } from "./JobTranscriptPanel";

type JobStatusCardProps = {
  job: Job;
  label?: string;
};

function formatDateTime(value: string | undefined): string {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString();
}

function getJobDownloadUrl(jobId: string): string {
  return `/api/jobs/${jobId}/download`;
}

export function JobStatusCard({ job, label }: JobStatusCardProps) {
  const [isClipsExpanded, setIsClipsExpanded] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [clips, setClips] = useState<Clip[] | null>(null);
  const [isLoadingClips, setIsLoadingClips] = useState(false);
  const [clipsError, setClipsError] = useState("");
  
  const [transcriptText, setTranscriptText] = useState<string | null>(null);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const handleToggleExpand = async () => {
    const nextIsExpanded = !isClipsExpanded;
    setIsClipsExpanded(nextIsExpanded);

    if (!nextIsExpanded || clips !== null || isLoadingClips) {
      return;
    }

    setIsLoadingClips(true);
    setClipsError("");

    try {
      const loadedClips = await getClips(job.id);
      setClips(loadedClips);
    } catch (error) {
      if (error instanceof Error) {
        setClipsError(error.message);
      } else {
        setClipsError("Failed to load clips");
      }
    } finally {
      setIsLoadingClips(false);
    }
  };

  const handleToggleTranscript = async () => {
    const nextIsExpanded = !isTranscriptExpanded;
    setIsTranscriptExpanded(nextIsExpanded);
    setCopyMessage("");

    if (!nextIsExpanded || transcriptText !== null || isLoadingTranscript) {
      return;
    }

    setIsLoadingTranscript(true);
    setTranscriptError("");

    try {
      const loadedTranscript = await getTranscript(job.id);
      setTranscriptText(loadedTranscript);
    } catch (error) {
      if (error instanceof Error) {
        setTranscriptError(error.message);
      } else {
        setTranscriptError("Failed to load transcript");
      }
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  const handleCopyTranscript = async () => {
    if (transcriptText === null || transcriptText.trim() === "") {
      return;
    }

    try {
      await navigator.clipboard.writeText(transcriptText);
      setCopyMessage("Copied to clipboard.");
    } catch {
      setCopyMessage("Could not copy transcript.");
    }
  };

  const handleDownloadAll = () => {
    window.location.assign(getJobDownloadUrl(job.id));
  };

  return (
    <section className="job-result">
      {label ? <p className="job-result-label">{label}</p> : null}
      <p>
        <strong>Job ID:</strong> {job.id}
      </p>
      <p>
        <strong>Status:</strong> {job.status}
      </p>
      <p>
        <strong>Clip Selection Mode:</strong> {job.clipSelectionMode}
      </p>
      <p>
        <strong>YouTube URL:</strong> {job.youtubeUrl}
      </p>
      {job.requestedClipCount ? (
        <p>
          <strong>Requested Clip Count:</strong> {job.requestedClipCount}
        </p>
      ) : null}
      <p>
        <strong>Created:</strong> {formatDateTime(job.createdAt)}
      </p>
      <p>
        <strong>Updated:</strong> {formatDateTime(job.updatedAt)}
      </p>
      {job.workflowId ? (
        <p>
          <strong>Workflow ID:</strong> {job.workflowId}
        </p>
      ) : null}
      {job.errorMessage ? (
        <p className="error-message">
          <strong>Error:</strong> {job.errorMessage}
        </p>
      ) : null}

      <div className="job-actions">
        <button
          className="job-toggle-button"
          type="button"
          onClick={() => void handleToggleExpand()}
        >
          {isClipsExpanded ? "Hide Clips" : "Show Clips"}
        </button>
        <button
          className="job-toggle-button"
          type="button"
          onClick={() => void handleToggleTranscript()}
        >
          {isTranscriptExpanded ? "Hide Transcript" : "Show Transcript"}
        </button>
        <button
          className="job-toggle-button"
          type="button"
          onClick={handleDownloadAll}
          disabled={job.status !== "completed"}
          title={
            job.status === "completed"
              ? "Download all completed clips for this job"
              : "Download All becomes available when the job is completed"
          }
        >
          Download All
        </button>
      </div>

      {isTranscriptExpanded ? (
        <JobTranscriptPanel
          transcriptText={transcriptText}
          isLoadingTranscript={isLoadingTranscript}
          transcriptError={transcriptError}
          copyMessage={copyMessage}
          onCopyTranscript={handleCopyTranscript}
        />
      ) : null}

      {isClipsExpanded ? (
        <JobClipsPanel
          clips={clips}
          isLoadingClips={isLoadingClips}
          clipsError={clipsError}
        />
      ) : null}
    </section>
  );
}
