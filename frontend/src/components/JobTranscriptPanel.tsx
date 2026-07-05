type JobTranscriptPanelProps = {
  transcriptText: string | null;
  isLoadingTranscript: boolean;
  transcriptError: string;
  copyMessage: string;
  onCopyTranscript: () => Promise<void>;
};

export function JobTranscriptPanel({
  transcriptText,
  isLoadingTranscript,
  transcriptError,
  copyMessage,
  onCopyTranscript,
}: JobTranscriptPanelProps) {
  return (
    <section className="job-transcript">
      {isLoadingTranscript ? <p>Loading transcript...</p> : null}
      {transcriptError ? <p className="error-message">{transcriptError}</p> : null}
      {!isLoadingTranscript &&
      !transcriptError &&
      (transcriptText === null || transcriptText.trim() === "") ? (
        <p>Transcript is not available yet.</p>
      ) : null}
      {transcriptText && transcriptText.trim() !== "" ? (
        <>
          <div className="job-transcript-actions">
            <button
              className="job-toggle-button"
              type="button"
              onClick={() => void onCopyTranscript()}
            >
              Copy Transcript
            </button>
            {copyMessage ? <p className="job-copy-message">{copyMessage}</p> : null}
          </div>
          <pre className="job-transcript-text">{transcriptText}</pre>
        </>
      ) : null}
    </section>
  );
}
