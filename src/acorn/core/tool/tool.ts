import type { JSONValue, Known } from "../../schema/schema";
import type { JSONSchemaType } from "ajv";

export type ToolMetadata<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  description: string;
  name: string;
  parameters?: T;
};

export interface Tool<T = any> {
  call?: (input: T) => JSONValue | Promise<JSONValue>;
  metadata: T extends Known ? ToolMetadata<JSONSchemaType<T>> : ToolMetadata;
}
