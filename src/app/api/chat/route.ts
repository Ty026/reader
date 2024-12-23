import { advanceQuery } from "@/acorn/query/advance-query";
import { formatSSEChunk, MessageManager } from "./messager";
import { generateId } from "@/app/demo/generate-id";

function iteratorToStream(iterator: any) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
  });
}

const encoder = new TextEncoder();

async function* makeCompletion(query: string) {
  const messager = new MessageManager(generateId(), "001", "text");
  const results = await advanceQuery(query, "hybrid");
  const initChunk = messager.createInitSSEChunk();
  yield encoder.encode(formatSSEChunk(initChunk));
  for await (const r of results) {
    const chunk = messager.updateText(r.delta);
    if (chunk) yield encoder.encode(formatSSEChunk(chunk));
  }

  const chunk = messager.updateMessage((msg) => {
    msg.message.status = "finished_successfully";
    msg.message.end_turn = true;
    msg.message.metadata.message_type = null;
    msg.message.metadata.is_complete = true;
  });
  if (chunk) yield encoder.encode(formatSSEChunk(chunk));
}

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    const iterator = makeCompletion(query);
    const stream = iteratorToStream(iterator);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify(err), {
      status: 500,
    });
  }
}
