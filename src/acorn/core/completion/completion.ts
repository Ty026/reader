import type OpenAI from "openai";
import { env } from "../../utils/env";
import type { Tool } from "../tool/tool";
import type { JSONObject } from "../../schema/schema";
import { toOpenAITool } from "../tool/to-openai-tool";
import { toOpenAIMessage } from "./to-openai-message";
import { isEmptyArray } from "../../utils/is-empty";
import { isEmptyOpenAIChoice } from "../../utils/is-empty";

export type OpenAIChatParams = Omit<
  Partial<OpenAI.Chat.ChatCompletionCreateParams>,
  | "max_tokens"
  | "messages"
  | "model"
  | "temperature"
  | "top_p"
  | "stream"
  | "tools"
  | "toolChoice"
>;

type CompletionParams = {
  model: OpenAI.ChatModel | (string & {});
  temperature: number;
  topP: number;
  maxRetries: number;
  maxTokens?: number;
  timeout: number;
  chatOptions: OpenAIChatParams;
  apiKey: string;
  baseURL?: string;
};

export type TextMessage = { type: "text"; text: string };
export type MessageContent = string | TextMessage[];
export type MessageType = "user" | "assistant" | "system" | "memory";

export type Message<T extends object = object> = {
  content: MessageContent;
  role: MessageType;
  options?: T;
};

export type ChatParams<C extends object = object, M extends object = object> = {
  messages: Message<M>[];
  additionalOptions?: C;
  tools?: Tool[];
};

export type ChatParamsStreaming<
  T extends object,
  U extends object,
> = ChatParams<T, U> & {
  stream: true;
};

export type ToolCall = {
  name: string;
  input: JSONObject;
  id: string;
};

export type PartialToolCall = {
  name: string;
  id: string;
  input: string;
};

export type ToolCallOptions = {
  toolCall: (ToolCall | PartialToolCall)[];
};

export type ToolResult = {
  id: string;
  result: string;
  isError: boolean;
};

export type ToolResultOptions = {
  toolResult: ToolResult;
};

export type ToolCallLLMMessageOptions =
  | ToolCallOptions
  | ToolResultOptions
  | {};

export type ChatParamsNonStreaming<
  C extends object,
  M extends object,
> = ChatParams<C, M> & {
  stream?: false | null | undefined;
};

type StreamingParams = ChatParamsStreaming<
  OpenAIChatParams,
  ToolCallLLMMessageOptions
>;
type NonStreamingParams = ChatParamsNonStreaming<
  OpenAIChatParams,
  ToolCallLLMMessageOptions
>;

export interface ChatResponse<T extends object = object> {
  message: Message<T>;
  raw: object | null;
}

export type ChatResponseChunk<T extends object = object> = {
  raw: object | null;
  delta: string;
  options?: undefined | T;
};

type StreamingResponse = AsyncIterable<
  ChatResponseChunk<ToolCallLLMMessageOptions>
>;
type NonStreamingResponse = ChatResponse<ToolCallLLMMessageOptions>;

export class Completion {
  model: OpenAI.ChatModel | (string & {});
  temperature: number;
  topP: number;
  maxRetries: number;
  maxTokens: number | undefined;
  timeout?: number;
  chatOptions: OpenAIChatParams | undefined;
  apiKey: string;
  baseURL?: string;
  constructor({
    model = "gpt-4o-mini",
    temperature = 0.1,
    topP = 1,
    timeout = 60 * 1000,
    maxRetries = 10,
    maxTokens,
    chatOptions,
    apiKey,
    baseURL,
  }: Partial<CompletionParams> = {}) {
    this.model = model;
    this.temperature = temperature;
    this.topP = topP;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    this.maxTokens = maxTokens;
    this.chatOptions = chatOptions;
    this.apiKey = apiKey || env("OPENAI_API_KEY");
    this.baseURL = baseURL;
  }

  chat(params: StreamingParams): Promise<StreamingResponse>;
  chat(params: NonStreamingParams): Promise<NonStreamingResponse>;
  async chat(
    params: StreamingParams | NonStreamingParams,
  ): Promise<StreamingResponse | NonStreamingResponse> {
    const { messages, stream, tools, additionalOptions } = params;
    const payload = {
      model: this.model,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      top_p: this.topP,
      tools: tools?.map(toOpenAITool),
      messages: messages.map(toOpenAIMessage),
      ...Object.assign({}, this.chatOptions, additionalOptions),
    } as OpenAI.Chat.ChatCompletionCreateParams;

    if (isEmptyArray(payload.tools)) delete payload.tools;

    if (stream) return this.streamChat(payload);

    const client = await this.lazyClient();
    const response = await client.chat.completions.create({
      ...payload,
      stream: false,
    });
    const content = response.choices[0]!.message.content ?? "";
    return {
      raw: response,
      message: {
        content,
        role: response.choices[0]?.message.role!,
        options: response.choices[0]?.message?.tool_calls
          ? {
              toolCall: response.choices[0]!.message.tool_calls.map((tc) => ({
                id: tc.id,
                name: tc.function.name,
                input: tc.function.arguments,
              })),
            }
          : {},
      },
    };
  }

  async *streamChat(params: OpenAI.Chat.ChatCompletionCreateParams) {
    const client = await this.lazyClient();
    const stream = await client.chat.completions.create({
      ...params,
      stream: true,
    });

    let currentToolCall = null as PartialToolCall | null;
    const toolCalls = new Map<string, PartialToolCall>();

    for await (const part of stream) {
      if (part.choices.length === 0) {
        if (part.usage) yield { raw: part, delta: "" };
        continue;
      }
      const choice = part.choices[0]!;
      if (isEmptyOpenAIChoice(choice)) continue;

      let shouldEmitToolCall: PartialToolCall | null = null;
      const call = choice.delta.tool_calls?.[0];
      if (
        currentToolCall !== null &&
        call?.id &&
        call?.id !== currentToolCall.id
      ) {
        shouldEmitToolCall = {
          ...currentToolCall,
          input: JSON.parse(currentToolCall.input),
        };
      }

      if (call?.id) {
        currentToolCall = {
          name: call.function?.name!,
          id: call.id,
          input: call.function?.arguments!,
        };
        toolCalls.set(call.id, currentToolCall);
      } else if (call?.function?.arguments) {
        currentToolCall!.input += call.function.arguments!;
      }

      const done = choice.finish_reason !== null;
      if (done && currentToolCall) {
        shouldEmitToolCall = {
          ...currentToolCall,
          input: JSON.parse(currentToolCall.input),
        };
      }

      yield {
        raw: part,
        options: shouldEmitToolCall
          ? { toolCall: [shouldEmitToolCall] }
          : currentToolCall
            ? { toolCall: [currentToolCall] }
            : {},
        delta: choice.delta.content ?? "",
      };
    }
    toolCalls.clear();
  }

  private _client?: OpenAI;
  private lazyClient(): Promise<OpenAI> {
    if (!this._client) {
      return new Promise((resolve) => {
        import("openai").then(({ OpenAI }) => {
          const openaiClient = new OpenAI({
            apiKey: this.apiKey,
            maxRetries: this.maxRetries,
            timeout: this.timeout!,
            baseURL: this.baseURL,
            ...this.chatOptions,
          });
          this._client = openaiClient;
          resolve(openaiClient);
        });
      });
    }
    return Promise.resolve(this._client);
  }
}
