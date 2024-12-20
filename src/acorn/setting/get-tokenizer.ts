import { Tokenizers, tokenizers } from "../core/tokenizer/tokenizer";

const tokenizer = tokenizers.tokenizer(Tokenizers.DEEPSEEK);
export function getTokenizer() {
  return tokenizer;
}
