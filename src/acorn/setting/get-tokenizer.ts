import { Tokenizers, tokenizers } from "../core/tokenizer/tokenizer";

const tokenizer = tokenizers.tokenizer(Tokenizers.CL200K_BASE);
export function getTokenizer() {
  return tokenizer;
}
