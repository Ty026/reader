import type { NodeLike } from "../../schema/schema";
import { Tokenizers, tokenizers } from "../tokenizer/tokenizer";
import { Transform } from "../transform/transform";

const kEmbedBatchSize = 10;

export type EmbeddingInfo = {
  dimensions?: number;
  maxTokens?: number;
  tokenizer?: Tokenizers;
};

export abstract class Embedding extends Transform {
  embedBatchSize = kEmbedBatchSize;
  embedInfo?: EmbeddingInfo;

  constructor(transformFn?: (nodes: NodeLike[]) => Promise<NodeLike[]>) {
    if (!transformFn) {
      transformFn = async (nodes: NodeLike[]) => {
        const texts = nodes.map((node) => node.content);
        const embeddings = await this.getTextEmbeddingsBatch(texts);
        for (let i = 0; i < nodes.length; i++) {
          nodes[i]!.embedding = embeddings[i];
        }
        return nodes;
      };
    }
    super(transformFn);
  }

  abstract getTextEmbedding(text: string): Promise<number[]>;

  async getTextEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const embedding = await this.getTextEmbedding(text);
      embeddings.push(embedding);
    }
    return embeddings;
  }

  async getTextEmbeddingsBatch(texts: string[]): Promise<Array<number[]>> {
    return await batchEmbeddings(
      texts,
      this.getTextEmbeddings.bind(this),
      this.embedBatchSize,
    );
  }

  protected truncateMaxTokens(input: string[]): string[] {
    return input.map((s) => {
      if (!(this.embedInfo?.tokenizer && this.embedInfo?.maxTokens)) return s;
      return truncateMaxTokens(
        this.embedInfo.tokenizer,
        s,
        this.embedInfo.maxTokens,
      );
    });
  }
}

export function truncateMaxTokens(
  tokenizer: Tokenizers,
  value: string,
  maxTokens: number,
): string {
  if (value.length * 2 < maxTokens) return value;
  const t = tokenizers.tokenizer(tokenizer);
  let tokens = t.encode(value);
  if (tokens.length > maxTokens) {
    tokens = tokens.slice(0, maxTokens);
    value = t.decode(tokens);
    return value.replace("¿", "");
  }
  return value;
}

type EmbedFunc<T> = (values: T[]) => Promise<number[][]>;
export async function batchEmbeddings<T>(
  values: T[],
  embedFunc: EmbedFunc<T>,
  chunkSize: number,
): Promise<number[][]> {
  const resultEmbeddings: number[][] = [];
  const queue: T[] = values;
  const curBatch: T[] = [];
  for (let i = 0; i < queue.length; i++) {
    curBatch.push(queue[i]!);
    if (i == queue.length - 1 || curBatch.length == chunkSize) {
      const embeddings = await embedFunc(curBatch);
      resultEmbeddings.push(...embeddings);
      curBatch.length = 0;
    }
  }
  return resultEmbeddings;
}
