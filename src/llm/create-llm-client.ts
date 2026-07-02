import { getRequiredEnvironmentVariable } from "../config/env.js";

import { OpenAiLlmClient } from "./openai-llm-client.js";
import type { LlmClient } from "./types.js";

export function createLlmClient(): LlmClient {
  const provider = getRequiredEnvironmentVariable("LLM_PROVIDER");

  if (provider === "openai") {
    return new OpenAiLlmClient({
      apiKey: getRequiredEnvironmentVariable("LLM_API_KEY"),
      model: getRequiredEnvironmentVariable("LLM_MODEL"),
    });
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
}
