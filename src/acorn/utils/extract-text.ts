import type { QueryType } from "../schema/schema";
import type {
  MessageContent,
  TextMessage,
} from "../core/completion/completion";

export function extractText(message: MessageContent | QueryType): string {
  if (typeof message === "object" && "query" in message) {
    // TODO:
    return extractText((message as any).query);
  }

  if (typeof message !== "string" && !Array.isArray(message)) {
    console.warn("unknown message type", message);
    return `${message}`;
  } else if (Array.isArray(message)) {
    return message
      .filter((m): m is TextMessage => m.type === "text")
      .map((c) => c.text)
      .join("\n\n");
  } else {
    return message;
  }
}
