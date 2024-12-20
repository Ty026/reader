import { summarizeEntityDescriptionPrompt } from "./prompts/summarize-entity-description-prompt";
import { getCompletion } from "../setting/get-completion";
import { getLogger } from "../setting/logger";
import { getTokenizer } from "../setting/get-tokenizer";
import { kGraphFieldSep } from "./constants";

const llmModelMaxTokensize = 32768;
const entitySummaryToMaxTokens = 500;

export async function handleEntityRelationSummary(
  nodeOrEdgeName: string,
  description: string,
) {
  const tokens = getTokenizer().encode(description);
  if (tokens.length < entitySummaryToMaxTokens) return description;

  const truncatedDescription = getTokenizer().decode(
    tokens.slice(0, entitySummaryToMaxTokens),
  );

  const prompt = summarizeEntityDescriptionPrompt.format({
    entity_name: nodeOrEdgeName,
    description_list: truncatedDescription.split(kGraphFieldSep).join("\n"),
  });
  getLogger().verbose(`Trigger summary: ${nodeOrEdgeName}`);
  const response = await getCompletion().chat({
    messages: [{ role: "user", content: prompt }],
    additionalOptions: { max_completion_tokens: llmModelMaxTokensize >> 1 },
  });
  return response.message.content as string;
}
