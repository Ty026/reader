export const a = {
  v: {
    message: {
      id: "DDxjqIQ8JXWb7yxF",
      author: { role: "assistant", name: null, metadata: {} },
      create_time: null,
      update_time: null,
      content: { content_type: "text", parts: [""] },
      status: "in_progress",
      end_turn: null,
      metadata: { message_type: "next", parent_id: "DDxjqIQ8JXWb7yxF" },
      recipient: "all",
    },
    conversation_id: "001",
    error: null,
  },
  o: "add",
};

export const b = {
  v: "你好",
  p: "/message/content/parts/0",
  o: "append",
};

export const c = { v: "！" };

export const d = { v: "很" };

export const e = {
  v: [
    { v: null, p: "/message/metadata/message_type", o: "replace" },
    { v: true, p: "/message/metadata/is_complete", o: "add" },
    { v: true, p: "/message/end_turn", o: "replace" },
    { v: "finished_successfully", p: "/message/status", o: "replace" },
  ],
  p: "",
  o: "patch",
};

export const replace = {
  o: "replace",
  p: "/message/recipient",
  v: "test",
};
