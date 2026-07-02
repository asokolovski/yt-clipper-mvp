import { z } from "zod";

import type {
  ClipSelectionInput,
  ClipSelector,
  SelectedClip,
} from "./types.js";
import type { LlmClient } from "../llm/types.js";

// A Zod schema is a runtime blueprint for data.
// Unlike a TypeScript type, it can check data that arrives from an API.
const SelectedClipSchema = z.object({
  title: z.string(),
  startTimeSeconds: z.number(),
  endTimeSeconds: z.number(),
  reason: z.string(),
});

export class LlmClipSelector implements ClipSelector {
  constructor(private readonly llmClient: LlmClient) {}

  async selectClips(input: ClipSelectionInput): Promise<SelectedClip[]> {
    const outputText = await this.llmClient.generateText({
      system: buildSystemPrompt(),
      prompt: buildUserPrompt(input),
    });

    if (outputText === "") {
      throw new Error("The LLM did not return any clip suggestions.");
    }

    // Step 1: JSON.parse turns the JSON text into an unknown JavaScript value.
    const parsedJson: unknown = JSON.parse(outputText);

    // Step 2: Zod checks that the value really has 1-3 valid clip objects.
    // If it does not, Zod throws an error and Temporal can retry the activity.
    const validatedResponse = createClipSelectionResponseSchema(
      input.requestedClipCount,
    ).parse(parsedJson);

    return validatedResponse.clips;
  }
}

function buildSystemPrompt(): string {
  return [
    "You select compelling, self-contained clips from timestamped YouTube transcripts.",
    "Select exactly the requested number of clips.",
    "Each clip must be between 20 and 60 seconds long.",
    "Prefer a strong opening, a complete thought, and a natural ending.",
    "Use absolute seconds from the original video, not times relative to a transcript section.",
    "Do not invent material that is absent from the transcript.",
    "Return valid JSON only.",
    'Use this shape: {"clips":[{"title":"string","startTimeSeconds":0,"endTimeSeconds":30,"reason":"string"}]}.',
  ].join(" ");
}

function buildUserPrompt(input: ClipSelectionInput): string {
  return [
    `The full video is approximately ${input.videoDurationSeconds.toFixed(2)} seconds long.`,
    `The transcript ends at approximately ${input.transcriptEndTimeSeconds.toFixed(2)} seconds.`,
    `Return exactly ${input.requestedClipCount} clips.`,
    "Select the best short-form clips from this transcript:",
    input.transcript,
  ].join("\n\n");
}

function createClipSelectionResponseSchema(requestedClipCount: number) {
  return z.object({
    clips: z
      .array(SelectedClipSchema)
      .min(requestedClipCount)
      .max(requestedClipCount),
  });
}
