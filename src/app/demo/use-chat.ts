import React from "react";
import { useId } from "react";
import type {
  ChatRequest,
  ChatRequestOptions,
  JSONValue,
  Message,
  UseChatOptions,
} from "./types";

import { generateId as generateIdFn } from "./generate-id";
import useSWR from "swr";

export const useChat = ({
  api,
  id,
  initialInput = "",
  generateId = generateIdFn,
  initialMessages,
}: UseChatOptions) => {
  const hookId = useId();
  const idKey = id ?? hookId;
  const chatKey = typeof idKey === "string" ? [api, idKey] : idKey;

  const [initialMessagesFallback] = React.useState<Message[]>([]);
  const { data: messages, mutate } = useSWR<Message[]>(
    [chatKey, "messages"],
    null,
    { fallbackData: initialMessages ?? initialMessagesFallback },
  );

  const { data: isLoading = false, mutate: mutateLoading } = useSWR<boolean>(
    [chatKey, "loading"],
    null,
  );

  const { data: error = undefined, mutate: setError } = useSWR<
    undefined | Error
  >([chatKey, "error"], null);

  const { data: streamData, mutate: mutateStreamData } = useSWR<
    JSONValue[] | undefined
  >([chatKey, "streamData"], null);
  const streamDataRef = React.useRef<JSONValue[] | undefined>(streamData);
  React.useEffect(() => {
    streamDataRef.current = streamData;
  }, [streamData]);

  const [input, setInput] = React.useState(initialInput);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  const messagesRef = React.useRef<Message[]>(messages || []);
  const handleInputChange = (e: any) => {
    setInput(e.target.value);
  };

  const triggerRequest = React.useCallback(
    async (chatRequest: ChatRequest, input: string) => {
      mutate(chatRequest.messages, false);
      mutateLoading(true);
      setError(undefined);
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      await processResponseStream(api, chatRequest, streamDataRef, messagesRef);
    },
    [],
  );

  const handleSubmit = React.useCallback(
    async (
      event?: { preventDefault: () => void },
      options: ChatRequestOptions = {},
    ) => {
      event?.preventDefault?.();
      if (!input) return;
      const messages = messagesRef.current.concat({
        id: generateId(),
        createdAt: new Date(),
        role: "user",
        content: input,
      });

      const chatRequest: ChatRequest = {
        messages,
        headers: options.headers,
        body: options.body,
        data: options.data,
      };

      triggerRequest(chatRequest, input);

      setInput("");
    },
    [input, generateId],
  );

  return {
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    messages: messages || [],
    isLoading,
  };
};

async function processResponseStream(
  api: string,
  chatRequest: ChatRequest,
  // mutate: KeyedMutator<Message[]>,
  // mutateStreamData: KeyedMutator<JSONValue[] | undefined>,
  existingDataRef: React.RefObject<JSONValue[] | undefined>,
  // extraMetadataRef: React.RefObject<any>,
  messagesRef: React.RefObject<Message[]>,
  // abortControllerRef: React.RefObject<AbortController | null>,
  // generateId: IdGenerator,
  // streamProtocol: UseChatOptions["streamProtocol"],
  // onFinish: UseChatOptions["onFinish"],
  // onResponse: ((response: Response) => void | Promise<void>) | undefined,
  // sendExtraMessageFields: boolean | undefined,
  // fetch: FetchFunction | undefined,
  // keepLastMessageOnError: boolean,
) {
  // Do an optimistic update to the chat state to show the updated messages immediately:
  const previousMessages = messagesRef.current;
  const query = chatRequest.messages[chatRequest.messages.length - 1].content;

  const existingData = existingDataRef.current;

  // return await callChatApi({
  //   api,
  //   body: {
  //     // messages: constructedMessagesPayload,
  //     query: query,
  //     // data: chatRequest.data,
  //     ...extraMetadataRef.current.body,
  //     ...chatRequest.body,
  //   },
  //   streamProtocol,
  //   credentials: extraMetadataRef.current.credentials,
  //   headers: {
  //     ...extraMetadataRef.current.headers,
  //     ...chatRequest.headers,
  //   },
  //   abortController: () => abortControllerRef.current,
  //   restoreMessagesOnFailure() {
  //     if (!keepLastMessageOnError) {
  //       mutate(previousMessages, false);
  //     }
  //   },
  //   onResponse,
  //   onUpdate(merged, data) {
  //     mutate([...chatRequest.messages, ...merged], false);
  //     if (data?.length) {
  //       mutateStreamData([...(existingData ?? []), ...data], false);
  //     }
  //   },
  //   onFinish,
  //   generateId,
  //   fetch,
  // });
}
