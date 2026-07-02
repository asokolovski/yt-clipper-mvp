import OpenAI from "openai";

import type { LlmClient } from "./types.js";

type OpenAiLlmClientOptions = {
  apiKey: string;
  model: string;
};

export class OpenAiLlmClient implements LlmClient {
  private readonly client: OpenAI;

  constructor(private readonly options: OpenAiLlmClientOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
    });
  }

  async generateText(input: {
    system: string;
    prompt: string;
  }): Promise<string> {
    const response = await this.client.responses.create({
      model: this.options.model,
      store: false,
      input: [
        {
          role: "system",
          content: input.system,
        },
        {
          role: "user",
          content: input.prompt,
        },
      ],
    });

    return response.output_text;
  }
}
