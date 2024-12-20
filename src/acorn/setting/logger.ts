import { Logger } from "../logger/logger";

let logger = new Logger({ context: "RAG" });

export function getLogger() {
  return logger;
}
