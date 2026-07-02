export type SelectedClip = {
  title: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  reason: string;
};

export type ClipSelectionMode = "ai" | "sequential";

export type ClipSelectionInput = {
  transcript: string;
  transcriptEndTimeSeconds: number;
  videoDurationSeconds: number;
  requestedClipCount: number;
};

export interface ClipSelector {
  selectClips(input: ClipSelectionInput): Promise<SelectedClip[]>;
}
