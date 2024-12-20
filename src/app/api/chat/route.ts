import { advanceQuery } from "@/acorn/query/advance-query";

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
  const results = await advanceQuery(query, "hybrid");
  for await (const r of results) {
    const data = { content: r.delta };
    yield encoder.encode(
      "event: delta\ndata: " + JSON.stringify(data) + "\n\n",
    );
  }
}

export async function POST(request: Request) {
  const { messages } = await request.json();
  const input = messages[messages.length - 1].content;
  const iterator = makeCompletion(input);
  const stream = iteratorToStream(iterator);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
