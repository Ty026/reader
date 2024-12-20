import type { MessageContent } from "../completion/completion";

export type Metadata = Record<string, any>;

export type JSONValue = string | number | boolean | JSONObject | JSONArray;

export type JSONObject = {
  [key: string]: JSONValue;
};

export type JSONArray = JSONValue[];

export type Nullable<T> = T | null;

export type MaybeFuture<T> = T | Promise<T>;

export type Known =
  | { [key: string]: Known }
  | [Known, ...Known[]]
  | Known[]
  | number
  | string
  | boolean
  | null;

export type QueryBundle = {
  query: MessageContent;
  customEmbeddings?: string[];
  embeddings?: number[];
};

export type QueryType = string | QueryBundle;

export type RagQueryParam = {};

export type Chunk = {
  id: string;
  content: string;
  embedding?: number[];
  metadata: {} & {
    tokens: number;
    orderIndex: number;
    docId: string;
    page?: number;
    chapter?: number;
    title?: number;
  };
};

export type NodeLike = {
  id: string;
  content: string;
  embedding: number[] | undefined;
  metadata?: Metadata;
};
