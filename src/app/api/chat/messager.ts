import { applyPatch, compare, Operation } from "fast-json-patch";

type Role = "assistant" | "user" | "tool";
type MessageStatus = "in_progress" | "finished_successfully";
type ContentType = "text" | "code" | "execution_output";
type Content<T extends ContentType> = T extends "text"
  ? { content_type: T; parts: string[] }
  : T extends "code"
    ? {
        content_type: T;
        language: string;
        response_format_name: string | null;
        text: string;
      }
    : T extends "execution_output"
      ? { content_type: T; text: string }
      : never;

export type Pack<T extends ContentType> = {
  message: {
    id: string;
    author: { role: Role; name: string | null; metadata: object };
    create_time: Date | null;
    update_time: Date | null;
    content: Content<T>;
    status: MessageStatus;
    end_turn: boolean | null;
    metadata: {
      message_type: "next" | null;
      parent_id: string | null;
      is_complete?: boolean | null;
    };
    recipient: string;
  };
  conversation_id: string;
  error: string | null;
};

interface SSEChunk<T extends ContentType = "text"> {
  event: "delta";
  data: {
    v?: any;
    p?: string;
    o?: string;
    message?: Pack<T>["message"];
  };
}

export function formatSSEChunk(chunk: SSEChunk): string {
  return `event: ${chunk.event}\ndata: ${JSON.stringify(chunk.data)}\n\n`;
}

interface AppendOperation {
  op: "append";
  path: string;
  value: string;
}

type CustomOperation = Operation | AppendOperation;

function makeContent<T extends ContentType>(type: T): Content<T>;
function makeContent(type: ContentType): Content<ContentType> {
  if (type === "text") {
    return { content_type: type, parts: [""] };
  } else if (type === "code") {
    return {
      content_type: type,
      language: "python",
      response_format_name: null,
      text: "",
    };
  } else if (type === "execution_output") {
    return { content_type: type, text: "" };
  } else {
    throw new Error(`unknown content type: ${type}`);
  }
}

export class MessageManager<T extends ContentType = "text"> {
  private currentPack: Pack<T>;
  private lastPack: Pack<T> | null = null;
  private lastAppendPath: string | null = null;
  private lastAppendOperation: string | null = null;

  constructor(id: string, conversationId: string, contentType: T) {
    this.currentPack = {
      message: {
        id: id,
        author: { role: "assistant", name: null, metadata: {} },
        create_time: null,
        update_time: null,
        content: makeContent<T>(contentType),
        status: "in_progress",
        end_turn: null,
        metadata: {
          message_type: "next",
          parent_id: id,
        },
        recipient: "all",
      },
      conversation_id: conversationId,
      error: null,
    };
  }

  getCurrentPack(): Pack<T> {
    return this.currentPack;
  }

  createInitSSEChunk(): SSEChunk<T> {
    return {
      event: "delta",
      data: {
        v: this.currentPack,
        o: "add",
      },
    };
  }

  updateText(text: string): SSEChunk | null {
    return this.updateMessage((pack: Pack<T>) => {
      if (pack.message.content.content_type === "text")
        pack.message.content.parts[0] += text;
    });
  }

  updateMessage(updateFn: (pack: Pack<T>) => void): SSEChunk | null {
    this.lastPack = JSON.parse(JSON.stringify(this.currentPack));
    const lastContent =
      this.currentPack.message.content.content_type === "text"
        ? this.currentPack.message.content.parts[0]
        : null;
    updateFn(this.currentPack);
    const patches = compare(this.lastPack!, this.currentPack) as Operation[];

    if (patches.length === 0) {
      return null;
    }

    const appendPatches = patches.reduce((acc, patch) => {
      if (patch.path.includes("/message/content/parts/")) {
        const value =
          this.currentPack.message.content.content_type === "text"
            ? this.currentPack.message.content.parts[0].slice(
                lastContent?.length || 0,
              )
            : "";
        const appendPatch: AppendOperation = {
          op: "append",
          path: patch.path,
          value,
        };
        acc.push(appendPatch);
      } else {
        acc.push(patch);
      }
      return acc;
    }, [] as CustomOperation[]);

    const sseChunks = appendPatches.map((patch) => {
      const sseChunk: SSEChunk = {
        event: "delta",
        data: {
          v: (patch as any).value,
        },
      };
      if (
        this.lastAppendPath !== patch.path ||
        this.lastAppendOperation !== patch.op
      ) {
        sseChunk.data.p = patch.path;
        sseChunk.data.o = patch.op;
        this.lastAppendPath = patch.path;
        this.lastAppendOperation = patch.op;
      }
      return sseChunk;
    }) as SSEChunk[];

    if (sseChunks.length === 1) {
      return sseChunks[0];
    }

    return {
      event: "delta",
      data: {
        v: sseChunks.map((item) => item.data),
        p: "",
        o: "patch",
      },
    };
  }

  applyPatch(patches: CustomOperation[]): void {
    applyPatch(this.currentPack, patches as any);
  }
}
