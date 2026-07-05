import type { ClipSelectionMode } from "../api";

type ClipOptionsFormProps = {
  clipSelectionMode: ClipSelectionMode;
  requestedClipCount: string;
  onClipSelectionModeChange: (value: ClipSelectionMode) => void;
  onRequestedClipCountChange: (value: string) => void;
};

export function ClipOptionsForm({
  clipSelectionMode,
  requestedClipCount,
  onClipSelectionModeChange,
  onRequestedClipCountChange,
}: ClipOptionsFormProps) {
  return (
    <div className="clip-options">
      <div className="clip-field">
        <label htmlFor="clip-selection-mode">Clip selection mode</label>
        <select
          className="clip-select"
          id="clip-selection-mode"
          value={clipSelectionMode}
          onChange={(event) =>
            onClipSelectionModeChange(event.target.value as ClipSelectionMode)
          }
        >
          <option value="ai">AI</option>
          <option value="sequential">Sequential</option>
        </select>
      </div>

      {clipSelectionMode === "ai" ? (
        <div className="clip-field">
          <label htmlFor="requested-clip-count">Requested clip count</label>
          <input
            className="clip-count-input"
            id="requested-clip-count"
            type="number"
            min={1}
            max={5}
            step={1}
            value={requestedClipCount}
            onChange={(event) => onRequestedClipCountChange(event.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}
