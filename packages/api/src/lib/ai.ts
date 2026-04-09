import { google } from "@ai-sdk/google";
import { embed } from "ai";

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: google.textEmbeddingModel("gemini-embedding-exp"),
    value: text,
  });

  return embedding;
}
