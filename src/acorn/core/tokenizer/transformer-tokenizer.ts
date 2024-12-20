import {
  AutoTokenizer,
  PreTrainedTokenizer,
  env as TransformerEnv,
} from "@xenova/transformers";
import { join } from "path";

export class TransformerTokenizer {
  tokenizer!: PreTrainedTokenizer;
  constructor() {
    TransformerEnv.localModelPath = join(process.cwd(), "model");
  }

  async init() {
    if (!this.tokenizer)
      this.tokenizer = await AutoTokenizer.from_pretrained("./", {});
  }

  encode(text: string) {
    return this.tokenizer.encode(text);
  }

  decode(tokens: number[]) {
    return this.tokenizer.decode(tokens);
  }
}
