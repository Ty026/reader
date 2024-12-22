interface Author {
  role: "assistant";
  name: null | string;
  metadata: Record<string, any>;
}

interface Content {
  content_type: "text";
  parts: string[];
}

interface FinishDetails {
  type: "stop";
  stop_tokens: number[];
}

interface Metadata {
  finish_details?: FinishDetails;
  is_complete?: boolean;
  message_type?: "next" | null;
}

interface Message {
  id: string;
  author: Author;
  create_time: number;
  update_time: number | null;
  content: Content;
  status: "in_progress" | "finished_successfully";
  end_turn: boolean | null;
  metadata: Metadata;
  recipient: "all";
}

interface DeltaChunkBase {
  p?: string;
  o?: "append" | "replace" | "patch";
}

interface DeltaChunkAppend extends DeltaChunkBase {
  o: "append";
  v: string;
}

interface DeltaChunkReplace extends DeltaChunkBase {
  o: "replace";
  v: any;
}

interface DeltaChunkAppendMetadata extends DeltaChunkBase {
  o: "append";
  p?: string;
  v: any;
}

type DeltaChunkPatchItem = DeltaChunkReplace | DeltaChunkAppendMetadata;
interface DeltaChunkPatch extends DeltaChunkBase {
  o: "patch";
  v: Array<DeltaChunkPatchItem>;
}

type DeltaChunk = DeltaChunkAppend | DeltaChunkPatch | DeltaChunkReplace;

interface SSEChunk {
  event: "delta";
  data: {
    v?: string | any | Array<any>;
    p?: string;
    o?: string;
    message?: Message;
  };
}

const kPathMessageContent = "/message/content/parts/0";

export function formatSSEChunk(chunk: SSEChunk): string {
  return `event: ${chunk.event}\ndata: ${JSON.stringify(chunk.data)}\n\n`;
}

export class MessageManager {
  private currentMessage: Message;
  private lastModifiedPath: string | null | undefined = null;
  private lastModifiedOperation: "append" | "replace" | null = null;

  constructor(id: string) {
    this.currentMessage = {
      id: id,
      author: { role: "assistant", name: null, metadata: {} },
      create_time: Date.now() / 1000,
      update_time: null,
      content: { content_type: "text", parts: [""] },
      status: "in_progress",
      end_turn: null,
      metadata: {
        message_type: "next",
      },
      recipient: "all",
    };
  }

  getCurrentMessage(): Message {
    return this.currentMessage;
  }

  createInitSSEChunk(): SSEChunk {
    return {
      event: "delta",
      data: {
        message: this.currentMessage,
      },
    };
  }

  applyDelta(delta: DeltaChunk): SSEChunk | null | SSEChunk[] {
    if (delta.o === "append" && delta.p === undefined) {
      if (!this.currentMessage.content.parts) {
        this.currentMessage.content.parts = [];
      }
      this.currentMessage.content.parts[0] += delta.v;
      const sseChunk: SSEChunk = {
        event: "delta",
        data: {
          v: delta.v,
        },
      };

      if (
        this.lastModifiedPath !== kPathMessageContent ||
        this.lastModifiedOperation !== "append"
      ) {
        sseChunk.data.p = kPathMessageContent;
        sseChunk.data.o = "append";
        this.lastModifiedPath = kPathMessageContent;
        this.lastModifiedOperation = "append";
      }

      return sseChunk;
    } else if (delta.o === "replace") {
      const keys = delta.p?.split("/").filter(Boolean);
      if (keys) {
        let target = this.currentMessage as any;
        for (let i = 0; i < keys.length - 1; i++) {
          target = target[keys[i]];
        }
        target[keys[keys.length - 1]] = delta.v;
      }

      const sseChunk: SSEChunk = {
        event: "delta",
        data: {
          v: delta.v,
          p: delta.p,
          o: delta.o,
        },
      };

      this.lastModifiedPath = delta.p;
      this.lastModifiedOperation = delta.o;

      return sseChunk;
    } else if (delta.o === "patch") {
      const patchData: any[] = [];
      delta.v.forEach((item) => {
        const patchItem = {
          ...item,
          p: item.p?.replace(/^\/message/, ""),
        } as DeltaChunkReplace;
        const res = this.applyDelta(patchItem);
        if (res && !Array.isArray(res)) {
          patchData.push({ ...res.data, p: `/message${res.data.p}` });
        }

        if (item.p === "/message/metadata" && item.o === "append") {
          this.currentMessage.metadata = {
            ...this.currentMessage.metadata,
            ...item.v,
          };
          patchData.push({ p: `/message/metadata`, o: "append", v: item.v });
        }
      });
      return {
        event: "delta",
        data: {
          v: patchData,
          p: "",
          o: "patch",
        },
      };
    }
    return null;
  }

  createPatchDelta(
    status: "finished_successfully",
    endTurn: boolean,
    finishDetails: FinishDetails,
  ): DeltaChunkPatch {
    return {
      o: "patch",
      v: [
        { p: "/message/status", o: "replace", v: status },
        { p: "/message/end_turn", o: "replace", v: endTurn },
        {
          p: "/message/metadata",
          o: "append",
          v: {
            is_complete: true,
            finish_details: finishDetails,
          },
        },
      ],
    };
  }
}
