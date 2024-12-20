import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { Tool } from "./tool";

export function toOpenAITool(tool: Tool): ChatCompletionTool {
  return {
    type: "function",
    function: tool.metadata.parameters
      ? {
          name: tool.metadata.name,
          description: tool.metadata.description,
          parameters: tool.metadata.parameters,
        }
      : {
          name: tool.metadata.name,
          description: tool.metadata.description,
        },
  };
}
