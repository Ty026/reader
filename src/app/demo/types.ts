export type JSONValue =
  | null
  | string
  | number
  | boolean
  | { [value: string]: JSONValue }
  | Array<JSONValue>;

export type IdGenerator = () => string;

export type UseChatOptions = {
  api: string;
  id?: string;
  initialInput?: string;
  generateId?: IdGenerator;
  initialMessages?: Message[];
};

export type ChatRequestOptions = {
  headers?: Record<string, string> | Headers;
  body?: object;
  data?: JSONValue;
};

export interface Message {
  id: string;

  createdAt?: Date;

  content: string;

  role: "system" | "user" | "assistant" | "data";
}

export type ChatRequest = {
  headers?: Record<string, string> | Headers;

  body?: object;

  messages: Message[];

  data?: JSONValue;
};
