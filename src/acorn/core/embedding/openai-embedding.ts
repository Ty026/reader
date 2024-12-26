import type { Nullable } from "../../schema/schema";
import { Tokenizers } from "../tokenizer/tokenizer";
import { env } from "../../utils/env";
import { Embedding } from "./embedding";
import type {
  ClientOptions as OpenAIClientOptions,
  OpenAI as OpenAILLM,
} from "openai";

type OpenAIClient = Pick<OpenAILLM, "embeddings" | "apiKey">;

const kModels = {
  "text-embedding-ada-002": {
    dimensions: 1536,
    maxTokens: 8192,
    tokenizer: Tokenizers.CL100K_BASE,
  },
  "text-embedding-3-small": {
    dimensions: 1536,
    dimensionOptions: [512, 1536],
    maxTokens: 8192,
    tokenizer: Tokenizers.CL100K_BASE,
  },
  "text-embedding-3-large": {
    dimensions: 3072,
    dimensionOptions: [256, 1024, 3072],
    maxTokens: 8192,
    tokenizer: Tokenizers.CL100K_BASE,
  },
};

export type OpenAIEmbeddingParams = {
  model?: string;
  apiKey?: string;
  maxRetries?: number;
  timeout?: number;
  dimensions?: number;
} & Omit<Partial<OpenAIClientOptions>, "apiKey" | "maxRetries" | "timeout">;

export class OpenAIEmbedding extends Embedding {
  private model: string;
  private dimensions: number;
  private apiKey: string;
  private maxRetries: number;
  private timeout?: number;
  private options: Omit<
    Partial<OpenAIClientOptions>,
    "apiKey" | "maxRetries" | "timeout"
  >;
  private client_: Nullable<Promise<OpenAIClient>> = null;

  constructor({
    model = "text-embedding-3-small",
    apiKey = env("OPENAI_API_KEY"),
    maxRetries = 10,
    timeout = 60 * 1000,
    dimensions = 1536,
    ...rest
  }: OpenAIEmbeddingParams = {}) {
    super();
    this.model = model;
    this.apiKey = apiKey;
    this.maxRetries = maxRetries;
    this.timeout = timeout;
    this.dimensions = dimensions;
    this.options = rest;
    const key = Object.keys(kModels).find(
      (key) => key === this.model,
    ) as keyof typeof kModels;
    if (key) this.embedInfo = kModels[key];
  }

  get client() {
    if (!this.client_) this.client_ = this.getClient();
    return this.client_;
  }

  override async getTextEmbedding(text: string): Promise<number[]> {
    return (await this.getOpenAIEmbedding([text]))[0]!;
  }

  override async getTextEmbeddings(texts: string[]): Promise<number[][]> {
    return await this.getOpenAIEmbedding(texts);
  }

  private async getOpenAIEmbedding(input: string[]) {
    input = this.truncateMaxTokens(input);
    const c = await this.client;
    const { data } = await c.embeddings.create(
      this.dimensions
        ? { model: this.model, dimensions: this.dimensions, input }
        : { model: this.model, input },
    );
    return data.map((d) => d.embedding);
  }

  private async getClient() {
    const { OpenAI } = await import("openai");
    return new OpenAI({
      apiKey: this.apiKey,
      maxRetries: this.maxRetries,
      timeout: this.timeout!,
      baseURL: env("OPENAI_API_BASE_URL"),
      ...this.options,
    });
  }
}
