import { JSONValue, LanguageModelFinishReason, Message } from "./types";
import { generateId as generateIdFunc } from "./generate-id";
import { processDataStream } from "./process-data-stream";

type ProcessChatResponse = {
  stream: ReadableStream<Uint8Array>;
  update: (newMessages: Message[], data: JSONValue[] | undefined) => void;
  onFinish?: (options: {
    message: Message | undefined;
    finishReason: LanguageModelFinishReason;
  }) => void;
  generateId?: () => string;
  getCurrentDate?: () => Date;
};

export async function processChatResponse({
  stream,
  update,
  onFinish,
  generateId = generateIdFunc,
  getCurrentDate = () => new Date(),
}: ProcessChatResponse) {
  const createdAt = getCurrentDate();

  let currentMessage: Message | undefined = undefined;
  let createNewMessage = true;
  const previousMessages: Message[] = [];

  const data: JSONValue[] = [];

  let messageAnnotations: JSONValue[] | undefined = undefined;

  let finishReason: LanguageModelFinishReason = "unknown";

  function execUpdate() {
    // make a copy of data array to ensure UI is updated(SWR)
    const copiedData = [...data];

    // if there is not current message, update still(data might have changed)
    if (currentMessage == null) {
      update(previousMessages, copiedData);
      return;
    }

    // keeps the currentMessage up to date with the latest annotations,
    // even if annotations preceded the message creation
    if (messageAnnotations?.length) {
      currentMessage.annotations = messageAnnotations;
    }

    const copiedMessage = {
      // deep copy the message to ensure that deep changes  are updated
      ...JSON.parse(JSON.stringify(currentMessage)),

      // add a reversion id to ensure that the message is updated with SWR.
      // SWR uses a hashing approach by default to detech changes, but it only works for shallow
      // changes
      // This is why we need to add a revision id to ensure that the message
      // is updated with SWR(without it, the changes get stuck in SWR and are not forwarded to rendering)
      revisionId: generateId(),

      createdAt: currentMessage.createdAt,
    } as Message;

    update([...previousMessages, copiedMessage], copiedData);
  }

  // switch to the next prefix map once we start receiving
  // content of the next message. Stream data annotations
  // are associated with the previous message until then to support
  // sending them in onFinish and onStepFinish
  function getMessage(): Message {
    if (createNewMessage || currentMessage == null) {
      if (currentMessage != null) {
        previousMessages.push(currentMessage);
      }
      createNewMessage = false;

      currentMessage = {
        id: generateId(),
        role: "assistant",
        content: "",
        createdAt,
      };
    }
    return currentMessage;
  }

  await processDataStream({
    stream,
    onTextPart(value) {
      const activeMessage = getMessage();
      currentMessage = {
        ...activeMessage,
        content: activeMessage.content + value,
      };
      execUpdate();
    },
    onDataPart(value) {
      data.push(...value);
      execUpdate();
    },
    onMessageAnnotationsPart(value) {
      if (messageAnnotations == null) {
        messageAnnotations = [...value];
      } else {
        messageAnnotations.push(...value);
      }
      execUpdate();
    },
    onFinishStepPart(value) {
      createNewMessage = !value.isContinued;
    },
    onFinishMessagePart(value) {
      finishReason = value.finishReason;
    },
    onErrorPart(err) {
      throw new Error(err);
    },
  });

  onFinish?.({ message: currentMessage, finishReason });
}
