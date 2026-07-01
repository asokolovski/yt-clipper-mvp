import { useEffect, useState } from "react";
import { getJobs, type Job } from "../api";
import { JobStatusCard } from "./JobStatusCard";

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
    <>
    <h1>All jobs</h1>
    {jobs === null ? (
      <p>Loading jobs...</p>
    ) : jobs !==null && jobs.length === 0 ? (
      <p>No jobs found.</p>
    ) : (
      <div className="jobs-list">
        {jobs.map((job) => (
          <JobStatusCard key={job.id} job={job} />
        ))}
      </div>
    )}
    </>
  );
}

export default JobsPage;
