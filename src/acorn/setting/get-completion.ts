import { Completion } from "../core/completion/completion";

export function getCompletion(responseFormat: "text" | "json_object" = "text") {
  return new Completion({
    // model: "deepseek-chat",
    // apiKey: process.env.DEEPSEEK_API_KEY,
    // baseURL: "https://api.deepseek.com",
    model: "gpt-4o",
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_API_BASE_URL,
    chatOptions: {
      response_format: { type: responseFormat },
    },
  });
}
