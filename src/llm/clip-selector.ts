import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { getRequiredEnvironmentVariable } from "../config/env.js";

// A Zod schema is a runtime blueprint for data.
// Unlike a TypeScript type, it can check data that arrives from an API.
const SelectedClipSchema = z.object({
  title: z.string(),
  startTimeSeconds: z.number(),
  endTimeSeconds: z.number(),
  reason: z.string(),
});

const ClipSelectionResponseSchema = z.object({
  clips: z.array(SelectedClipSchema).min(1).max(3),
});

// Zod can also create the matching TypeScript type for us.
// This keeps the runtime schema and TypeScript type in sync.
export type SelectedClip = z.infer<typeof SelectedClipSchema>;

export type ClipSelectionInput = {
  transcript: string;
  transcriptEndTimeSeconds: number;
};

export interface ClipSelector {
  selectClips(input: ClipSelectionInput): Promise<SelectedClip[]>;
}

class OpenAIClipSelector implements ClipSelector {
  private readonly client = new OpenAI({
    apiKey: getRequiredEnvironmentVariable("LLM_API_KEY"),
  });

  private readonly model = getRequiredEnvironmentVariable("LLM_MODEL");

  async selectClips(input: ClipSelectionInput): Promise<SelectedClip[]> {
    const response = await this.client.responses.create({
      model: this.model,
      store: false,
      input: [
        {
          role: "system",
          content: [
            "You select compelling, self-contained clips from timestamped YouTube transcripts.",
            "Select between 1 and 3 clips.",
            "Each clip must be between 20 and 60 seconds long.",
            "Prefer a strong opening, a complete thought, and a natural ending.",
            "Use absolute seconds from the original video, not times relative to a transcript section.",
            "Do not invent material that is absent from the transcript.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `The transcript ends at approximately ${input.transcriptEndTimeSeconds.toFixed(2)} seconds.`,
            "Select the best short-form clips from this transcript:",
            input.transcript,
          ].join("\n\n"),
        },
      ],
      text: {
        // This converts our Zod schema into JSON Schema and sends it to
        // OpenAI. Structured output tells the model which shape to return.
        format: zodTextFormat(ClipSelectionResponseSchema, "clip_selection"),
      },
    });

    // The API response is text at this point, even though that text contains
    // JSON. First, make sure the model actually returned something.
    const outputText = response.output_text;

    if (outputText === "") {
      throw new Error("The LLM did not return any clip suggestions.");
    }

    // Step 1: JSON.parse turns the JSON text into an unknown JavaScript value.
    const parsedJson: unknown = JSON.parse(outputText);

    // Step 2: Zod checks that the value really has 1-3 valid clip objects.
    // If it does not, Zod throws an error and Temporal can retry the activity.
    const validatedResponse = ClipSelectionResponseSchema.parse(parsedJson);

    return validatedResponse.clips;
  }
}

export function createClipSelector(): ClipSelector {
  const provider = getRequiredEnvironmentVariable("LLM_PROVIDER");

  // The rest of the app depends on ClipSelector, not directly on OpenAI.
  // Another provider can be added later as another branch here.
  if (provider === "openai") {
    return new OpenAIClipSelector();
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
}
