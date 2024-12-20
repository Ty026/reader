import { extractText } from "../../utils/extract-text";
import type { Message, MessageType } from "./completion";
import type {
  ChatCompletionMessageToolCall,
  ChatCompletionRole,
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";

export function toOpenAIMessage(
  message: Message<{}>,
): ChatCompletionMessageParam {
  // TODO: add support for other message types
  // const _ = message.options ?? {};
  if (message.role === "user") {
    return {
      role: "user",
      content: message.content,
    } satisfies ChatCompletionUserMessageParam;
  }

  const response:
    | ChatCompletionSystemMessageParam
    | ChatCompletionUserMessageParam
    | ChatCompletionMessageToolCall = {
    role: toOpenAIRole(message.role) as never,
    content: extractText(message.content),
  };
  return response;
}

function toOpenAIRole(messageType: MessageType): ChatCompletionRole {
  switch (messageType) {
    case "user":
      return "user";
    case "assistant":
      return "assistant";
    case "system":
      return "system";
    default:
      return "user";
  }
}
