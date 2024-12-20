import { naiveQueryPrompt } from "../core/prompts/naive-query-prompt";
import { tokenizers } from "../core/tokenizer/tokenizer";
import { getCompletion } from "../setting/get-completion";
import { getChunkDB, getChunkVectorDB } from "../setting/get-db";
import { getEmbedding } from "../setting/get-embedding";

export async function naiveQuery(query: string) {
  await tokenizers.init();

  const embedding = await getEmbedding().getTextEmbedding(query);
  const vectors = await getChunkVectorDB().query({
    embedding,
    topK: 2,
  });

  const chunks = await getChunkDB().getByHashs(vectors.ids);
  const sections = chunks
    .map((c, i) => `## 段落${i + 1}\n${c.content}\n`)
    .join("");

  const prompt = naiveQueryPrompt.format({ data: sections });
  const response = await getCompletion().chat({
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: query },
    ],
  });
  return response;
}
