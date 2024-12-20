import cl100kBase from "gpt-tokenizer";
import cl200kBase from "gpt-tokenizer/encoding/o200k_base";
import type { GptEncoding } from "gpt-tokenizer/GptEncoding";
import { TransformerTokenizer } from "./transformer-tokenizer";

export enum Tokenizers {
  CL100K_BASE = "cl100k_base",
  CL200K_BASE = "cl200k_base",
  DEEPSEEK = "deepseek",
}

export interface Tokenizer {
  encode: (text: string) => Uint32Array;
  decode: (tokens: Uint32Array) => string;
}

const deepseekTokenizer = new TransformerTokenizer();

class TokenizerSingleton {
  _gpt: Tokenizer;
  baseGpt!: GptEncoding;
  baseTransformer!: TransformerTokenizer;
  _transformer: Tokenizer;

  constructor() {
    this._gpt = {
      encode: (text: string): Uint32Array => {
        return new Uint32Array(this.baseGpt.encode(text));
      },
      decode: (tokens: Uint32Array) => {
        return this.baseGpt.decode(tokens);
      },
    };
    this._transformer = {
      encode: (text: string): Uint32Array => {
        return new Uint32Array(deepseekTokenizer.encode(text));
      },
      decode: (tokens: Uint32Array) => {
        return deepseekTokenizer.decode([...tokens]);
      },
    };
  }

  async init() {
    await deepseekTokenizer.init();
  }

  tokenizer(tokenizer?: Tokenizers): Tokenizer {
    if (tokenizer === Tokenizers.CL200K_BASE) {
      this.baseGpt = cl200kBase;
      return this._gpt;
    } else if (tokenizer === Tokenizers.CL100K_BASE) {
      this.baseGpt = cl100kBase;
      return this._gpt;
    } else if (tokenizer === Tokenizers.DEEPSEEK) {
      this.baseTransformer = deepseekTokenizer;
      return this._transformer;
    }
    throw new Error(`Invalid tokenizer: ${tokenizer}`);
  }
}

export const tokenizers = new TokenizerSingleton();
