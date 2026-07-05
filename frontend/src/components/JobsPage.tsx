import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJobs, type Job } from "../api";
import { JobStatusCard } from "./JobStatusCard";
import "./JobsPage.css";

function JobsPage() {
  const [jobs, setJobs] = useState<Job[] | null>(null);

  useEffect(() => {
    document.title = "All Jobs | YouTube Clipper MVP";
  }, []);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const jobsData = await getJobs();
        setJobs(jobsData);
      } catch (error) {
        console.error("Failed to fetch jobs", error);
      }
    };
    fetchJobs();
  }, []);

  return (
    <main className="jobs-page">
      <Link to="/" className="jobs-page-link">
          Back to generator
        </Link>
      <div className="jobs-page-inner">
        <header className="jobs-page-header">
          <p className="jobs-page-eyebrow">Job History</p>
          <h1>All jobs</h1>
          <p className="jobs-page-description">
            Review every clip generation request and see when it ran, how it was configured, and what state it is in now.
          </p>
        </header>

        {jobs === null ? (
          <p className="jobs-page-message">Loading jobs...</p>
        ) : jobs.length === 0 ? (
          <p className="jobs-page-message">No jobs found.</p>
        ) : (
          <div className="jobs-list">
            {jobs.map((job) => (
              <JobStatusCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default JobsPage;
