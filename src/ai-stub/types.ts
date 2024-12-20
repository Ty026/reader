export type JSONValue =
  | null
  | string
  | number
  | boolean
  | { [value: string]: JSONValue }
  | Array<JSONValue>;

export type IdGenerator = () => string;

export type FetchFunction = typeof globalThis.fetch;

export interface Message {
  // unique identifier for this message
  id: string;

  createdAt?: Date;

  content: string;

  role: "system" | "user" | "assistant" | "data";

  data?: JSONValue;

  annotations?: JSONValue[] | undefined;
}

export type CreateMessage = Omit<Message, "id"> & {
  id?: Message["id"];
};

export type UseChatOptions = {
  // keeps the last message when an error happens
  keepLastMessageOnError?: boolean;

  // the api endpoint that accepts a `{messages: Message[]}` object and returns
  api: string;

  // a unique identifier for the chat. If not provided, a random one will be generated,
  // When provided, the `useChat` hook with the same `id` will have shared states across components
  id?: string;

  // initial messages of the chat
  initialMessages?: Message[];

  // initial input of the chat
  initialInput?: string;

  onResponse?: (response: Response) => void | Promise<void>;

  onFinish?: (
    message: Message,
    options: {
      finishReason: LanguageModelFinishReason;
    },
  ) => void;

  onError?: (error: Error) => void;

  // a way to provide a function that is going to be used for ids for messages
  generateId?: IdGenerator;

  credentials?: RequestCredentials;

  headers?: Record<string, string> | Headers;

  /**
   * Extra body object to be sent with the API request.
   * @example
   * Send a `sessionId` to the API along with the messages
   * ```js
   * useChat({
   *  body: {"foo": "bar"}
   * })
   * ````
   */
  body?: object;

  // whether to send extra message fields such as `message.id`
  // and `message.createdAt` to the API
  // defaults to `false`. when set to `true`, the API endpoint
  // need to handle the extra fields before forwarding the reqeust
  // to the AI service
  sendExtraMessageFields?: boolean;

  // streaming protocol that is used. defaults to `data`
  streamProtocol?: "data" | "text";

  // custom fetch implementation.
  fetch?: FetchFunction;
};

export type LanguageModelFinishReason =
  | "stop" // model generated stop sequence
  | "length" // model generated maximum number of tokens
  | "content-filter" // content filter violation stopped the model
  | "tool-calls" // model triggered tool calls
  | "error" // model stopped because of an error
  | "other" // model stopped for other reasons
  | "unknown"; // the model has not transmitted a finish reason

export type ChatRequest = {
  // An optional object of headers to be passed to the API endpoint.
  headers?: Record<string, string> | Headers;

  // An optional object to be passed to the API endpoint.
  body?: object;

  // The messages of the chat.
  messages: Message[];

  // Additional data to be sent to the server.
  data?: JSONValue;
};

export type ChatRequestOptions = {
  headers?: Record<string, string> | Headers;

  body?: object;

  data?: JSONValue;

  allowEmptySubmit?: boolean;
};
