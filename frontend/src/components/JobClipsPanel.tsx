import type { Clip } from "../api";

type JobClipsPanelProps = {
  clips: Clip[] | null;
  isLoadingClips: boolean;
  clipsError: string;
};

export function JobClipsPanel({
  clips,
  isLoadingClips,
  clipsError,
}: JobClipsPanelProps) {
  return (
    <div className="job-clips">
      {isLoadingClips ? <p>Loading clips...</p> : null}
      {clipsError ? <p className="error-message">{clipsError}</p> : null}
      {clips !== null && clips.length === 0 ? <p>No clips yet.</p> : null}
      {clips?.map((clip) => (
        <section key={clip.id} className="job-clip">
          <p>
            <strong>Title: {clip.title}</strong>
          </p>
          <p>
            <strong>Time:</strong> {Math.floor(clip.startTimeSeconds)}s to{" "}
            {Math.floor(clip.endTimeSeconds)}s ={" "}
            {Math.floor(clip.endTimeSeconds - clip.startTimeSeconds)}s
          </p>
          <p>
            <strong>Status:</strong> {clip.status}
          </p>
          <p>
            <strong>Reasoning:</strong> {clip.reason}
          </p>
          {clip.status === "completed" ? (
            <video
              className="job-clip-video"
              controls
              src={`/api/clips/${clip.id}/stream`}
            />
          ) : (
            <p>Clip is still processing.</p>
          )}
        </section>
      ))}
    </div>
  );
}
