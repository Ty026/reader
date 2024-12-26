import { Completion } from "../core/completion/completion";

export function getCompletion(responseFormat: "text" | "json_object" = "text") {
  return new Completion({
    // model: "deepseek-chat",
    model: "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_API_BASE_URL,
    // baseURL: "https://api.deepseek.com",
    chatOptions: {
      response_format: { type: responseFormat },
    },
  });
}
