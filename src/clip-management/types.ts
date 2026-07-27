export type ClipStatus = "selected" | "rendering" | "completed" | "failed";

export type Clip = {
  id: string;
  title: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  reason: string;
  status: ClipStatus;
  filePath: string | null;
};

export type ClipFileRecord = {
  id: string;
  title: string;
  status: ClipStatus;
  filePath: string | null;
};
