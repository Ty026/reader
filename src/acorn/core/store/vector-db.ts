import type { Embedding } from "../embedding/embedding";
import type { NodeLike } from "../../schema/schema";

export enum FilterOperator {
  EQ = "==", // default operator (string, number)
  IN = "in", // In array (string or number)
  GT = ">", // greater than (number)
  LT = "<", // less than (number)
  NE = "!=", // not equal to (string, number)
  GTE = ">=", // greater than or equal to (number)
  LTE = "<=", // less than or equal to (number)
  NIN = "nin", // Not in array (string or number)
  ANY = "any", // Contains any (array of strings)
  ALL = "all", // Contains all (array of strings)
  TEXT_MATCH = "text_match", // full text match (allows you to search for a specific substring, token or phrase within the text field)
  CONTAINS = "contains", // metadata array contains value (string or number)
  IS_EMPTY = "is_empty", // the field is not exist or empty (null or empty array)
}

export enum FilterCondition {
  AND = "and",
  OR = "or",
}

export type MetadataFilterValue = string | number | string[] | number[];

export interface MetadataFilter {
  key: string;
  value?: MetadataFilterValue;
  operator: `${FilterOperator}`; // ==, any, all,...
}

export interface MetadataFilters {
  filters: Array<MetadataFilter>;
  condition?: `${FilterCondition}`; // and, or
}

export interface VectorQuery {
  embedding?: number[];
  topK: number;
  hashIds?: string[];
  queryStr?: string;
  alpha?: number;
  filters?: MetadataFilters | undefined;
  mmrThreshold?: number;
}

export interface VectorQueryResult {
  nodes?: NodeLike[];
  similarities: number[];
  ids: string[];
}

export interface VectorStore {
  embedModel?: Embedding;
  add(nodes: NodeLike[]): Promise<string[]>;
  delete(refDocId: string, deleteOptions?: object): Promise<void>;
  query(query: VectorQuery, options?: object): Promise<VectorQueryResult>;
}
