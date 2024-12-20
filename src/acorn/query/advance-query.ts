import { defaultQAPrompt } from "../core/prompts/default-qa-prompt";
import { ragPrompt } from "../core/prompts/rag-prompt";
import { tokenizers } from "../core/tokenizer/tokenizer";
import { getCompletion } from "../setting/get-completion";
import {
  getChunkDB,
  getEntityVectorDB,
  getGraphDB,
  getRelationshipVectorDB,
} from "../setting/get-db";
import { getEmbedding } from "../setting/get-embedding";
import { getLogger } from "../setting/logger";
import { buildGlobalQueryContext } from "./build-global-query-context";
import { buildLocalQueryContext } from "./build-local-query-context";
import { combineContext } from "./combine-context";
import { extractKeywordsFromQuery } from "./extract-keywords-from-query";

export async function advanceQuery(
  query: string,
  type: "local" | "global" | "hybrid" = "local",
) {
  await tokenizers.init();

  const allKeywords = await extractKeywordsFromQuery(query);
  if (
    !allKeywords ||
    allKeywords.high_level_keywords.length === 0 ||
    allKeywords.low_level_keywords.length === 0
  ) {
    const chatCompletion = getCompletion("text");
    const result = await chatCompletion.chat({
      messages: [
        { role: "system", content: defaultQAPrompt },
        { role: "user", content: query },
      ],
      stream: true,
    });
    return result;
  }

  let keywords = allKeywords.low_level_keywords;
  if (type === "global") keywords = allKeywords.high_level_keywords;

  let ctx: string | null = null;
  if (type === "local") {
    ctx = await buildLocalQueryContext(
      getEmbedding(),
      keywords.join(", "),
      getGraphDB(),
      getEntityVectorDB(),
      getChunkDB(),
      false,
    );
  } else if (type === "global") {
    ctx = await buildGlobalQueryContext(
      getEmbedding(),
      keywords.join(", "),
      getGraphDB(),
      getEntityVectorDB(),
      getRelationshipVectorDB(),
      getChunkDB(),
      false,
    );
  } else if (type === "hybrid") {
    const lowLevelCtx = await buildLocalQueryContext(
      getEmbedding(),
      allKeywords.low_level_keywords.join(", "),
      getGraphDB(),
      getEntityVectorDB(),
      getChunkDB(),
      true,
    );
    const highLevelCtx = await buildGlobalQueryContext(
      getEmbedding(),
      allKeywords.high_level_keywords.join(", "),
      getGraphDB(),
      getEntityVectorDB(),
      getRelationshipVectorDB(),
      getChunkDB(),
      true,
    );

    const combined = combineContext(lowLevelCtx, highLevelCtx);
    ctx = combined;
  }

  let systemPrompt = "";
  if (!ctx) {
    getLogger().error("No result");
    systemPrompt = `你只需要回答**对不起，我无法回答这个问题**`;
  } else {
    systemPrompt = ragPrompt.format({
      context: ctx,
      response_type: "多段文本",
    });
  }

  const chatCompletion = getCompletion("text");
  const result = await chatCompletion.chat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ],
    stream: true,
  });

  return result;
}
