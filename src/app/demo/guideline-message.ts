import { generateId } from "./generate-id";
import { Message } from "./types";

export const kGuideLineMessage: Message = {
  role: "assistant",
  content: "我是你的阅读小助手，有任何问题尽管问我。",
  id: generateId(),
  status: "finished_successfully",
};