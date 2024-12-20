import type OpenAI from "openai";

export const isEmptyArray = (mayBeArray: unknown): boolean => {
  return Array.isArray(mayBeArray) && mayBeArray.length === 0;
};

export const isEmptyOpenAIChoice = (
  c?: OpenAI.Chat.Completions.ChatCompletionChunk.Choice,
) => {
  if (!c) return true;
  return !(c.delta.content || c.delta.tool_calls || c.finish_reason);
};
