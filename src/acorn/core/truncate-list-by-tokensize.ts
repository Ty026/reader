import { getTokenizer } from "../setting/get-tokenizer";

export function truncateListByTokensize<T>(
  list: T[],
  key: (d: T) => string,
  max_tokens: number,
) {
  if (max_tokens <= 0) return [];
  let tokens = 0;
  for (let i = 0; i < list.length; i++) {
    tokens += getTokenizer().encode(key(list[i])).length;
    if (tokens > max_tokens) {
      return list.slice(0, i);
    }
  }
  return list;
}
