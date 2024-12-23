import { generateId } from "./generate-id";
import { processDataStream } from "./process-data-stream";
import { JSONValue, Message } from "./types";

type ProcessChatResponseOptions = {
  stream: ReadableStream<Uint8Array>;
  update: (newMessages: Message[], data: JSONValue[] | undefined) => void;
  onFinish?: (options: {
    message: Message | undefined;
    finishReason: any;
  }) => void;
};

export async function processChatResponse({
  stream,
  update,
}: ProcessChatResponseOptions) {
  let currentMessage: Message | undefined = undefined;
  let createNewMessage = true;
  const previousMessages: Message[] = [];
  const data: JSONValue[] = [];

  function execUpdate() {
    // make a copy of data array to ensure UI is updated(SWR)
    const copiedData = [...data];

    // if there is not current message, update still(data might have changed)
    if (currentMessage == null) {
      update(previousMessages, copiedData);
      return;
    }

    const copiedMessage = {
      // deep copy the message to ensure that  deep changes are updated
      ...JSON.parse(JSON.stringify(currentMessage)),

      // add a reversion id to ensure that the mssage is updated with SWR
      // SWR uses a hashing approach by default to detech changes,
      // but it only works for shallow changes
      // this is why we need to add a revision id to ensure that the message
      // is updated with SWR
      // (without it, the changes get stuck in SWR and are not forwarded to rendering)
      revisionId: generateId(),

      createdAt: currentMessage.createdAt,
    } as Message;

    update([...previousMessages, copiedMessage], copiedData);
  }

  function getMessage(id?: string, content?: string): Message {
    if (createNewMessage || currentMessage == null) {
      if (currentMessage != null) {
        previousMessages.push(currentMessage);
      }
      createNewMessage = false;
      currentMessage = {
        id: id ?? "unknown",
        content: content ?? "",
        role: "assistant",
        createdAt: new Date(),
        status: "in_progress",
      };
    }
    return currentMessage;
  }

  await processDataStream({
    stream,
    onPatch(value) {
      if (!value) return;
      const activeMessage = getMessage(value.id, value.content.parts[0]);
      currentMessage = {
        ...activeMessage,
        content: value.content.parts[0],
        status: value.status,
      };
      execUpdate();
    },
  });
}
