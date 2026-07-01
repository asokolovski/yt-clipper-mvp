import type { Job } from "../api";

export function JobStatusCard({ job }: { job: Job }) {
    return (
          <section className="job-result">
            <p className="job-result-label">Latest job started</p>
            <p>
              <strong>Job ID:</strong> {job.id}
            </p>
            <p>
              <strong>Status:</strong> {job.status}
            </p>
            {job.workflowId ? (
              <p>
                <strong>Workflow ID:</strong> {job.workflowId}
              </p>
            ) : null}
            <p>
              <strong>YouTube URL:</strong> {job.youtubeUrl}
            </p>
            {job.errorMessage ? (
              <p className="error-message">
                <strong>Error:</strong> {job.errorMessage}
              </p>
            ) : null}
          </section>
        )
}