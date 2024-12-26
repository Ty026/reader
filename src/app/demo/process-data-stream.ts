import { MessageBuilder } from "./message-builder";
import { fromSSEResponse } from "./streaming";
import type { Pack } from "../api/chat/messager";
import { generateId } from "./generate-id";

type ProcessDataStreamOptions = {
  stream: ReadableStream<Uint8Array>;
  onPatch: (value?: Pack<"text">["message"]) => void;
};
export async function processDataStream({
  stream,
  onPatch,
}: ProcessDataStreamOptions) {
  const result = fromSSEResponse<{
    event: string;
    data: {
      o: string;
      patch: string;
      v: object | object[];
    };
  }>(stream);
  const builder = new MessageBuilder();
  onPatch({
    id: generateId(),
    author: {
      role: "assistant",
      name: null,
      metadata: {},
    },
    content: { content_type: "text", parts: [""] },
    end_turn: null,
    metadata: {
      message_type: "next",
      parent_id: "",
    },
    recipient: "all",
    create_time: null,
    update_time: null,
    status: "preprocessing",
  });
  for await (const chunk of result) {
    builder.update(chunk.data);
    onPatch(builder.message);
  }
}
