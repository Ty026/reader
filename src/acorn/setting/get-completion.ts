import { Completion } from "../core/completion/completion";

export function getCompletion(responseFormat: "text" | "json_object" = "text") {
  return new Completion({
    model: "deepseek-chat",
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
    chatOptions: {
      response_format: { type: responseFormat },
    },
  });
}
