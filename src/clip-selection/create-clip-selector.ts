import { createLlmClient } from "../llm/create-llm-client.js";

import { LlmClipSelector } from "./llm-clip-selector.js";
import { SequentialClipSelector } from "./sequential-clip-selector.js";
import type { ClipSelectionMode, ClipSelector } from "./types.js";

export function createClipSelector(mode: ClipSelectionMode): ClipSelector {
  if (mode === "ai") {
    return new LlmClipSelector(createLlmClient());
  }

  if (mode === "sequential") {
    return new SequentialClipSelector();
  }

  throw new Error(`Unsupported clip selection mode: ${mode}`);
}
