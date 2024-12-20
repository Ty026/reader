import type { Embedding } from "../core/embedding/embedding";
import { OpenAIEmbedding } from "../core/embedding/openai-embedding";

let localEmbedding: Embedding | undefined;

export function getEmbedding() {
  if (!localEmbedding) {
    localEmbedding = new OpenAIEmbedding({ dimensions: 512 });
  }
  return localEmbedding;
}
