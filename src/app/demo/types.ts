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
  throttleWaitMs?: number;
  id?: string;
  initialInput?: string;
  generateId?: IdGenerator;
  initialMessages?: Message[];
  headers?: Record<string, string> | Headers;
  body?: object;
  onResponse?: (response: Response) => void | Promise<void>;
  onError?: (error: Error) => void;
  onFinish?: () => void | Promise<void>;
  onUpdate?: () => void;
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

  status: "in_progress" | "finished_successfully" | "preprocessing";
}

export type ChatRequest = {
  headers?: Record<string, string> | Headers;

  body?: object;

  messages: Message[];

  data?: JSONValue;
  query: string;
};
