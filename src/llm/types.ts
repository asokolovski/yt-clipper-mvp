export type GenerateTextInput = {
  system: string;
  prompt: string;
};

export interface LlmClient {
  generateText(input: GenerateTextInput): Promise<string>;
}
