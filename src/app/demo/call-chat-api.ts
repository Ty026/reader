import { processChatResponse } from "./process-chat-response";
import { JSONValue, Message } from "./types";

type CallChatApiOptions = {
  api: string;
  body: Record<string, unknown>;
  headers: HeadersInit | undefined;
  abortController: (() => AbortController | null) | undefined;
  restoreMessagesOnFailure: () => void;
  onResponse: ((response: Response) => void | Promise<void>) | undefined;
  onUpdate: (newMessages: Message[], data: JSONValue[] | undefined) => void;
  onFinish?: () => void | Promise<void>;
};
export async function callChatApi({
  api,
  body,
  headers,
  abortController,
  restoreMessagesOnFailure,
  onResponse,
  onUpdate,
  onFinish,
}: CallChatApiOptions) {
  let response: Response;
  try {
    response = await fetch(api, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      signal: abortController?.()?.signal,
    });
  } catch (err) {
    restoreMessagesOnFailure();
    throw err;
  }

  onResponse && (await onResponse(response));

  if (!response.ok) {
    restoreMessagesOnFailure();
    throw new Error(
      (await response.text()) ?? "Failed to fetch the chat response",
    );
  }

  if (!response.body) throw new Error("The response body is empty");

  try {
    await processChatResponse({
      stream: response.body,
      update: onUpdate,
      onFinish() {
        // TODO:
        console.log("finish");
      },
    });
  } catch (err) {
    restoreMessagesOnFailure();
    throw err;
  }
  onFinish && (await onFinish());
}
