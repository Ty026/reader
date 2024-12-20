import { Completion } from "../core/completion/completion";
import { keywordExtractPrompt } from "../core/prompts/keyword-extract-prompt";
import { getCompletion } from "../setting/get-completion";
import { getLogger } from "../setting/logger";

export async function extractKeywordsFromQuery(query: string) {
  const logger = getLogger();
  logger.verbose("Extract the query keywords...", query);
  const startTime = performance.now();

  const prompt = keywordExtractPrompt.format({ query });
  const completion = new Completion({
    model: "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY,
    // baseURL: "https://zz.hao-ai.cn/v1",
    chatOptions: {
      response_format: { type: "json_object" },
    },
  });
  // const completion = getCompletion("json_object");

  const response = await completion.chat({
    messages: [{ role: "user", content: prompt }],
  });
  let jsonText: {
    high_level_keywords: string[];
    low_level_keywords: string[];
  } = {} as any;
  try {
    jsonText = JSON.parse(response.message.content as string);
  } catch (_) {
    logger.error("Failed to parse JSON", response.message.content);
    return null;
  }

  if (!jsonText) return null;
  if (!jsonText.high_level_keywords) jsonText.high_level_keywords = [];
  if (!jsonText.low_level_keywords) jsonText.low_level_keywords = [];

  if (
    jsonText.low_level_keywords?.find((item) => item.indexOf("作者") !== -1) ||
    jsonText.high_level_keywords?.find((item) => item.indexOf("作者") !== -1)
  ) {
    jsonText.low_level_keywords.push("方明");
  }
  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000;
  logger.verbose(`Extracted the query keywords in ${duration} seconds`);
  return jsonText;
}
