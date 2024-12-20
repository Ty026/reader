type Bytes = Uint8Array;
export class Stream<T> implements AsyncIterable<T> {
  constructor(private iterator: () => AsyncIterator<T>) {}

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return this.iterator();
  }
}

export function fromSSEResponse<T>(
  stream: ReadableStream<Uint8Array>,
): Stream<T> {
  let consumed = false;
  async function* iterator(): AsyncIterator<T, any, any> {
    if (consumed) {
      throw new Error("Cannot iterate over a consumed stream");
    }
    consumed = true;
    let done = false;
    try {
      for await (const sse of iterSSEMessages(stream)) {
        if (done) continue;
        if (sse.data.startsWith("[DONE]")) {
          done = true;
          continue;
        }
        if (sse.event === null) {
          let data;

          try {
            data = JSON.parse(sse.data);
          } catch (e) {
            console.error(`Could not parse message into JSON:`, sse.data);
            console.error(`From chunk:`, sse.raw);
            throw e;
          }

          if (data && data.error) throw new Error(data.error);
          yield data;
        } else {
          let data;
          try {
            data = JSON.parse(sse.data);
          } catch (e) {
            console.error(`Could not parse message into JSON:`, sse.data);
            console.error(`From chunk:`, sse.raw);
            throw e;
          }
          if (sse.event === "error") {
            throw new Error(data.error, data.message);
          }
          yield { event: sse.event, data: data } as T;
        }
      }
      done = true;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      throw e;
    } finally {
      // User aborted the stream
      // if (!done) controller.abort();
    }
  }

  return new Stream(iterator);
}

async function* iterSSEMessages(stream: ReadableStream<Uint8Array>) {
  const sseDecoder = new SSEDecoder();
  const lineDecoder = new LineDecoder();

  const itr = readableStreamAsyncIterable<Bytes>(stream);
  for await (const chunk of iterSSEChunks(itr)) {
    for (const line of lineDecoder.decode(chunk)) {
      const sse = sseDecoder.decode(line);
      if (sse) yield sse;
    }
  }

  for (const line of lineDecoder.flush()) {
    const sse = sseDecoder.decode(line);
    if (sse) yield sse;
  }
}

export type ServerSentEvent = {
  event: string | null;
  data: string;
  raw: string[];
};

class SSEDecoder {
  #event: string | null = null;
  #data: string[] = [];
  #chunks: string[] = [];

  decode(line: string) {
    if (line.endsWith("\r")) line = line.substring(0, line.length - 1);
    if (!line) {
      // empty line and we didn't previously encounter any messages
      if (!this.#event && !this.#data.length) return null;
      const sse: ServerSentEvent = {
        event: this.#event,
        data: this.#data.join("\n"),
        raw: this.#chunks,
      };
      this.#event = null;
      this.#data = [];
      this.#chunks = [];
      return sse;
    }

    this.#chunks.push(line);
    if (line.startsWith(":")) return null;

    let [fieldname, _, value] = partition(line, ":");
    if (value.startsWith(" ")) value = value.substring(1);
    if (fieldname === "event") this.#event = value;
    else if (fieldname === "data") this.#data.push(value);
    return null;
  }
}

function partition(str: string, delimiter: string): [string, string, string] {
  const index = str.indexOf(delimiter);
  if (index !== -1) {
    return [
      str.substring(0, index),
      delimiter,
      str.substring(index + delimiter.length),
    ];
  }
  return [str, "", ""];
}

async function* iterSSEChunks(
  iterator: AsyncIterableIterator<Bytes>,
): AsyncGenerator<Uint8Array> {
  let buffer = new Uint8Array();
  for await (const chunk of iterator) {
    if (chunk == null) continue;

    // append chunk
    let newData = new Uint8Array(buffer.length + chunk.length);
    newData.set(buffer);
    newData.set(chunk, buffer.length);
    buffer = newData;

    let patternIndex = -1;
    while ((patternIndex = findDoubleNewlineIndex(buffer)) !== -1) {
      yield buffer.slice(0, patternIndex);
      buffer = buffer.slice(patternIndex);
    }
  }
  // yield the remainning bytes
  if (buffer.length > 0) yield buffer;
}

function findDoubleNewlineIndex(buffer: Uint8Array): number {
  // This function searches the buffer for the end patterns (\r\r, \n\n, \r\n\r\n)
  // and returns the index right after the first occurrence of any pattern,
  // or -1 if none of the patterns are found.
  const newline = 0x0a; // \n
  const carriage = 0x0d; // \r

  for (let i = 0; i < buffer.length - 2; i++) {
    if (buffer[i] === newline && buffer[i + 1] === newline) {
      // \n\n
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === carriage) {
      // \r\r
      return i + 2;
    }
    if (
      buffer[i] === carriage &&
      buffer[i + 1] === newline &&
      i + 3 < buffer.length &&
      buffer[i + 2] === carriage &&
      buffer[i + 3] === newline
    ) {
      // \r\n\r\n
      return i + 4;
    }
  }

  return -1;
}

function readableStreamAsyncIterable<T>(stream: any): AsyncIterableIterator<T> {
  if (stream[Symbol.asyncIterator]) return stream;
  const reader = stream.getReader();
  return {
    async next() {
      try {
        const result = await reader.read();
        if (result?.done) reader.releaseLock();
        return result as IteratorResult<T>;
      } catch (e) {
        reader.releaseLock();
        throw e;
      }
    },
    async return() {
      const cancel = reader.cancel();
      reader.releaseLock();
      await cancel;
      return { done: true, value: undefined };
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

const kNewlineChars = new Set(["\n", "\r"]);
const kNewlineRegexp = /\r\n|[\n\r]/g;

export class LineDecoder {
  #buffer: string[] = [];
  #trailingCR = false;

  decode(chunk?: Uint8Array): string[] {
    let text = this.#decodeText(chunk);
    if (this.#trailingCR) {
      text = "\r" + text;
      this.#trailingCR = false;
    }
    if (text.endsWith("\r")) {
      this.#trailingCR = true;
      text = text.slice(0, -1);
    }
    if (!text) return [];
    const trailingNewline = kNewlineChars.has(text[text.length - 1] || "");
    let lines = text.split(kNewlineRegexp);
    if (trailingNewline) lines.pop();

    if (lines.length === 1 && !trailingNewline) {
      this.#buffer.push(lines[0]!);
      return [];
    }

    if (this.#buffer.length > 0) {
      lines = [this.#buffer.join("") + lines[0], ...lines.slice(1)];
      this.#buffer = [];
    }

    if (!trailingNewline) {
      this.#buffer = [lines.pop() || ""];
    }
    return lines;
  }

  #decodeText(bytes?: Uint8Array) {
    if (bytes == null) return "";
    return Buffer.from(bytes).toString();
  }

  flush(): string[] {
    if (!this.#buffer.length && !this.#trailingCR) {
      return [];
    }
    const lines = [this.#buffer.join("")];
    this.#buffer = [];
    this.#trailingCR = false;
    return lines;
  }
}
