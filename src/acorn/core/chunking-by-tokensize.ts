import type { Chunk } from "../schema/schema";
import { getTokenizer } from "../setting/get-tokenizer";
import { hashId } from "../utils/hashid";

type ChunkingByTokensizeOptions = {
  overlapTokenSize?: number;
  maxTokenSize?: number;
};

export function chunkingByTokensize(
  content: string,
  options: ChunkingByTokensizeOptions = {},
) {
  const { overlapTokenSize = 128, maxTokenSize = 1024 } = options;
  const tokenizer = getTokenizer();
  const tokens = tokenizer.encode(content);
  const results: Chunk[] = [];
  const step = maxTokenSize - overlapTokenSize;
  for (
    let index = 0, start = 0;
    start < tokens.length;
    index++, start += step
  ) {
    const chunkContent = tokenizer.decode(
      tokens.slice(start, start + maxTokenSize),
    );
    const chunk: Chunk = {
      id: hashId(chunkContent),
      content: chunkContent.trim(),
      metadata: {
        tokens: Math.min(maxTokenSize, tokens.length - start),
        orderIndex: index,
        docId: "",
      },
    };
    results.push(chunk);
  }
  return results;
}
