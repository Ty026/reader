import React from "react";
import { useId } from "react";
import type { ChatRequest, ChatRequestOptions, JSONValue, Message, UseChatOptions } from "./types";

import { generateId as generateIdFn } from "./generate-id";
import useSWR, { KeyedMutator } from "swr";
import { throttle } from "./throttle";
import { callChatApi } from "./call-chat-api";

export const useChat = ({
  api,
  id,
  initialMessages,
  throttleWaitMs,
  headers,
  body,
  onResponse,
  onError,
  onFinish,
  onUpdate,
  initialInput = "",
  generateId = generateIdFn,
}: UseChatOptions) => {
  const hookId = useId();
  const idKey = id ?? hookId;
  const chatKey = typeof idKey === "string" ? [api, idKey] : idKey;

  const [initialMessagesFallback] = React.useState<Message[]>([]);
  const { data: messages, mutate } = useSWR<Message[]>([chatKey, "messages"], null, {
    fallbackData: initialMessages ?? initialMessagesFallback,
  });
  // keep the latest messages in a ref
  const messagesRef = React.useRef<Message[]>(messages || []);
  React.useEffect(() => {
    messagesRef.current = messages || [];
  }, [messages]);

  const { data: isLoading = false, mutate: mutateLoading } = useSWR<boolean>([chatKey, "loading"], null);

  const { data: error = undefined, mutate: setError } = useSWR<undefined | Error>([chatKey, "error"], null);

  const { data: streamData, mutate: mutateStreamData } = useSWR<JSONValue[] | undefined>([chatKey, "streamData"], null);
  const streamDataRef = React.useRef<JSONValue[] | undefined>(streamData);
  React.useEffect(() => {
    streamDataRef.current = streamData;
  }, [streamData]);

  const [input, setInput] = React.useState(initialInput);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handleInputChange = (e: any) => {
    setInput(e.target.value);
  };

  const extraMetadataRef = React.useRef({
    headers,
    body,
  });
  React.useEffect(() => {
    extraMetadataRef.current = { headers, body };
  }, [headers, body]);

  const triggerRequest = React.useCallback(
    async (chatRequest: ChatRequest) => {
      try {
        mutateLoading(true);
        setError(undefined);
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        await processResponseStream(
          api,
          chatRequest,
          throttle(mutate, throttleWaitMs),
          throttle(mutateStreamData, throttleWaitMs),
          streamDataRef,
          extraMetadataRef,
          messagesRef,
          abortControllerRef,

          onResponse,
          onFinish,
          onUpdate,
        );
      } catch (err) {
        // The user aborted the request
        if ((err as any).name === "AbortError") {
          abortControllerRef.current = null;
          console.log("abort");
          return null;
        }

        if (onError && err instanceof Error) onError(err);
        setError(err as Error);
      } finally {
        mutateLoading(false);
      }
    },
    [
      mutate,
      mutateLoading,
      api,
      extraMetadataRef,
      onResponse,
      // onFinish,
      onError,
      setError,
      mutateStreamData,
      streamDataRef,
      messagesRef,
      abortControllerRef,
      generateId,
      fetch,
      throttleWaitMs,
    ],
  );

  const handleSubmit = React.useCallback(
    async (event?: { preventDefault: () => void }, options: ChatRequestOptions = {}) => {
      event?.preventDefault?.();
      if (!input) return;
      console.log(input);
      const messages = messagesRef.current.concat({
        id: generateId(),
        createdAt: new Date(),
        role: "user",
        content: input,
        status: "finished_successfully",
      });

      const chatRequest: ChatRequest = {
        messages,
        headers: options.headers,
        body: options.body,
        data: options.data,
        query: input,
      };

      triggerRequest(chatRequest);

      setInput("");
    },
    [input, generateId, triggerRequest],
  );

  const setMessages = React.useCallback(
    (messages: Message[] | ((messages: Message[]) => Message[])) => {
      if (typeof messages === "function") {
        messages = messages(messagesRef.current);
      }
      mutate(messages, false);
      messagesRef.current = messages;
    },
    [mutate],
  );

  const stop = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      mutate(
        [...messagesRef.current].map((item) => ({
          ...item,
          status: "finished_successfully",
        })),
        false,
      );
    }
  }, []);

  return {
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    messages: messages || [],
    setMessages,
    isLoading,
    stop,
  };
};

async function processResponseStream(
  api: string,
  chatRequest: ChatRequest,
  mutate: KeyedMutator<Message[]>,
  mutateStreamData: KeyedMutator<JSONValue[] | undefined>,
  existingDataRef: React.RefObject<JSONValue[] | undefined>,
  extraMetadataRef: React.RefObject<any>,
  messagesRef: React.RefObject<Message[]>,
  abortControllerRef: React.RefObject<AbortController | null>,
  onResponse: ((response: Response) => void | Promise<void>) | undefined,
  onFinish: (() => void | Promise<void>) | undefined,
  onMessageUpdate?: () => void,
) {
  // Do an optimistic update to the chat state to show the updated messages immediately:
  const previousMessages = messagesRef.current;
  mutate(chatRequest.messages, false);
  onMessageUpdate?.();

  const existingData = existingDataRef.current;

  return await callChatApi({
    api,
    body: {
      query: chatRequest.query,
      data: chatRequest.data,
      ...extraMetadataRef.current.body,
      ...chatRequest.body,
    },
    headers: {
      ...extraMetadataRef.current.headers,
      ...chatRequest.headers,
    },
    abortController: () => abortControllerRef.current,
    restoreMessagesOnFailure() {
      mutate(previousMessages, false);
    },
    onResponse,
    onUpdate(merged, data) {
      const newMessages = [...chatRequest.messages, ...merged];
      mutate(newMessages, false);
      if (data?.length) {
        mutateStreamData([...(existingData ?? []), ...data], false);
      }
      onMessageUpdate?.();
    },
    onFinish,
  });
}
