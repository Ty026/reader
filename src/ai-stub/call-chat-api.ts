import { processChatResponse } from "./process-chat-response";
import { IdGenerator, JSONValue, Message, UseChatOptions } from "./types";

const getOriginalFetch = () => fetch;

type CallChatApiOptions = {
  api: string;
  body: Record<string, any>;
  streamProtocol: "data" | "text" | undefined;
  credentials: RequestCredentials;
  headers: HeadersInit | undefined;
  abortController: (() => AbortController | null) | undefined;
  restoreMessagesOnFailure: () => void;
  onResponse: ((response: Response) => void | Promise<void>) | undefined;
  onUpdate: (newMessages: Message[], data: JSONValue[] | undefined) => void;
  onFinish: UseChatOptions["onFinish"];
  generateId: IdGenerator;
  fetch: ReturnType<typeof getOriginalFetch> | undefined;
};

export async function callChatApi({
  api,
  body,
  credentials,
  headers,
  abortController,
  restoreMessagesOnFailure,
  onResponse,
  onUpdate,
  onFinish,
  generateId,
  streamProtocol = "data",
  fetch = getOriginalFetch(),
}: CallChatApiOptions) {
  const response = await fetch(api, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    signal: abortController?.()?.signal,
    credentials,
  }).catch((err) => {
    restoreMessagesOnFailure();
    throw err;
  });
  if (onResponse) {
    await onResponse(response);
  }

  if (!response.ok) {
    restoreMessagesOnFailure();
    throw new Error(
      (await response.text()) ?? "Failed to fetch the chat response",
    );
  }

  if (!response.body) {
    throw new Error("The response body is empty");
  }

  if (streamProtocol !== "data") {
    console.error("has error");
    throw new Error(`Unsupported stream protocol: ${streamProtocol}`);
  }

  await processChatResponse({
    stream: response.body,
    update: onUpdate,
    onFinish({ message, finishReason }) {
      if (onFinish && message != null) {
        onFinish(message, { finishReason });
      }
    },
    generateId,
  });
}
