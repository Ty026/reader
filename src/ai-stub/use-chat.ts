import {
  ChatRequest,
  ChatRequestOptions,
  CreateMessage,
  FetchFunction,
  IdGenerator,
  JSONValue,
  Message,
  UseChatOptions,
} from "./types";
import { throttle } from "./throttle";
import { generateId as generateIdFunc } from "./generate-id";
import { useId } from "react";
import React from "react";
import useSWR, { KeyedMutator } from "swr";
import { callChatApi } from "./call-chat-api";

const processResponseStream = async (
  api: string,
  chatRequest: ChatRequest,
  mutate: KeyedMutator<Message[]>,
  mutateStreamData: KeyedMutator<JSONValue[] | undefined>,
  existingDataRef: React.RefObject<JSONValue[] | undefined>,
  extraMetadataRef: React.RefObject<any>,
  messagesRef: React.RefObject<Message[]>,
  abortControllerRef: React.RefObject<AbortController | null>,
  generateId: IdGenerator,
  streamProtocol: UseChatOptions["streamProtocol"],
  onFinish: UseChatOptions["onFinish"],
  onResponse: ((response: Response) => void | Promise<void>) | undefined,
  sendExtraMessageFields: boolean | undefined,
  fetch: FetchFunction | undefined,
  keepLastMessageOnError: boolean,
) => {
  // Do an optimistic update to the chat state to show the updated messages immediately:
  const previousMessages = messagesRef.current;
  mutate(chatRequest.messages, false);

  const constructedMessagesPayload = sendExtraMessageFields
    ? chatRequest.messages
    : chatRequest.messages.map(({ role, content, data, annotations }) => ({
        role,
        content,
        ...(data !== undefined && { data }),
        ...(annotations !== undefined && { annotations }),
      }));

  const query = chatRequest.messages[chatRequest.messages.length - 1].content;

  const existingData = existingDataRef.current;

  return await callChatApi({
    api,
    body: {
      // messages: constructedMessagesPayload,
      query: query,
      // data: chatRequest.data,
      ...extraMetadataRef.current.body,
      ...chatRequest.body,
    },
    streamProtocol,
    credentials: extraMetadataRef.current.credentials,
    headers: {
      ...extraMetadataRef.current.headers,
      ...chatRequest.headers,
    },
    abortController: () => abortControllerRef.current,
    restoreMessagesOnFailure() {
      if (!keepLastMessageOnError) {
        mutate(previousMessages, false);
      }
    },
    onResponse,
    onUpdate(merged, data) {
      mutate([...chatRequest.messages, ...merged], false);
      if (data?.length) {
        mutateStreamData([...(existingData ?? []), ...data], false);
      }
    },
    onFinish,
    generateId,
    fetch,
  });
};

export function useChat({
  api,
  id,
  initialMessages,
  credentials,
  headers,
  body,
  throttleWaitMs,
  streamProtocol = "data",
  onFinish,
  onResponse,
  sendExtraMessageFields,
  keepLastMessageOnError = true,
  generateId = generateIdFunc,
  onError,
  maxSteps = 1,
  initialInput = "",
}: UseChatOptions & {
  throttleWaitMs?: number;
  maxSteps?: number;
}) {
  const hookId = useId();
  const idKey = id ?? hookId;
  const chatKey = typeof idKey === "string" ? [api, idKey] : idKey;

  // store a empty array as the initial messages
  // instead of using a default parameter value that gets re-created each time
  // to avoid re-renders:
  const [initialMessagesFallback] = React.useState([]);

  // store the chat state in SWR, using the chatId as the key to share states.
  const { data: messages, mutate } = useSWR<Message[]>(
    [chatKey, "messages"],
    null,
    { fallbackData: initialMessages ?? initialMessagesFallback },
  );

  // keep the latest messages in a ref
  const messagesRef = React.useRef<Message[]>(messages || []);
  React.useEffect(() => {
    messagesRef.current = messages || [];
  }, [messages]);

  const { data: streamData, mutate: mutateStreamData } = useSWR<
    JSONValue[] | undefined
  >([chatKey, "streamData"], null);

  // keep the latest stream data in a ref
  const streamDataRef = React.useRef<JSONValue[] | undefined>(streamData);
  React.useEffect(() => {
    streamDataRef.current = streamData;
  }, [streamData]);

  // store loading state in another hook to sync loading state across hook invocations
  const { data: isLoading = false, mutate: mutateLoading } = useSWR<boolean>(
    [chatKey, "loading"],
    null,
  );

  const { data: error = undefined, mutate: setError } = useSWR<
    undefined | Error
  >([chatKey, "error"], null);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  const extraMetadataRef = React.useRef({
    credentials,
    headers,
    body,
  });

  React.useEffect(() => {
    extraMetadataRef.current = {
      credentials,
      headers,
      body,
    };
  }, [credentials, headers, body]);

  const triggerRequest = React.useCallback(
    async (chatRequest: ChatRequest, input: string) => {
      const messageCount = messagesRef.current.length;
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
          generateId,
          streamProtocol,
          onFinish,
          onResponse,
          sendExtraMessageFields,
          fetch,
          keepLastMessageOnError,
        );
        abortControllerRef.current = null;
      } catch (err) {
        if ((err as any).name === "AbortError") {
          abortControllerRef.current = null;
          return null;
        }

        if (onError && err instanceof Error) {
          onError(err);
        }

        setError(err as Error);
      } finally {
        mutateLoading(false);
      }
      // auto-submit when all tool calls in the last assistant message have results
      // const messages = messagesRef.current;
      // const lastMessage = messages[messages.length - 1];
      // if (
      //   messages.length > messageCount &&
      //   lastMessage != null &&
      //   maxSteps > 1 &&
      //   countTrailingAssistantMessages(messages) < maxSteps
      // ) {
      //   await triggerRequest({ messages, input });
      // }
    },
    [
      mutate,
      mutateLoading,
      api,
      extraMetadataRef,
      onResponse,
      onFinish,
      onError,
      setError,
      mutateStreamData,
      streamDataRef,
      streamProtocol,
      sendExtraMessageFields,
      maxSteps,
      messagesRef,
      abortControllerRef,
      generateId,
      fetch,
      keepLastMessageOnError,
      throttleWaitMs,
    ],
  );

  const append = React.useCallback(
    async (
      message: Message | CreateMessage,
      { data, headers, body }: ChatRequestOptions = {},
    ) => {
      const messages = messagesRef.current.concat({
        ...message,
        id: message.id ?? generateId(),
        createdAt: message.createdAt ?? new Date(),
      });
      return triggerRequest({ messages, headers, body, data }, "");
    },
    [triggerRequest, generateId],
  );

  const reload = React.useCallback(
    async ({ data, headers, body }: ChatRequestOptions = {}) => {
      const messages = messagesRef.current;
      if (messages.length === 0) return null;

      // remove last assistant message and retry last user message
      const lastMessage = messages[messages.length - 1];
      return triggerRequest(
        {
          messages:
            lastMessage.role === "assistant" ? messages.slice(0, -1) : messages,
          headers,
          body,
          data,
        },
        "",
      );
    },
    [triggerRequest],
  );

  const stop = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

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

  const setData = React.useCallback(
    (
      data:
        | JSONValue[]
        | undefined
        | ((data: JSONValue[] | undefined) => JSONValue[] | undefined),
    ) => {
      if (typeof data === "function") {
        data = data(streamDataRef.current);
      }
      mutateStreamData(data, false);
      streamDataRef.current = data;
    },
    [mutateStreamData],
  );

  const [input, setInput] = React.useState(initialInput);

  const handleSubmit = React.useCallback(
    async (
      event?: { preventDefault?: () => void },
      options: ChatRequestOptions = {},
      metadata?: Object,
    ) => {
      event?.preventDefault?.();

      if (!input && !options.allowEmptySubmit) return;

      if (metadata) {
        extraMetadataRef.current = {
          ...extraMetadataRef.current,
          ...metadata,
        };
      }

      const messages =
        !input && options.allowEmptySubmit
          ? messagesRef.current
          : messagesRef.current.concat({
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
    [input, generateId, triggerRequest],
  );

  const handleInputChange = (e: any) => {
    setInput(e.target.value);
  };

  return {
    messages: messages || [],
    setMessages,
    data: streamData,
    setData,
    error,
    append,
    reload,
    stop,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
  };
}

function countTrailingAssistantMessages(messages: Message[]) {
  let count = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      count++;
    } else {
      break;
    }
  }
  return count;
}
