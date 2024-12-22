a = {
  o: "add",
  v: {
    message: {
      id: "001",
      author: { role: "assistant", name: null, metadata: {} },
      create_time: null,
      update_time: null,
      content: { content_type: "text", parts: ["你好呀!"] },
      status: "in_progress",
      end_turn: null,
      weight: 1.0,
      metadata: {
        message_type: "next",
        model_slug: "o1",
        default_model_slug: "o1",
        parent_id: "e41a9245-b434-45ce-8a0a-da13349f2651",
        model_switcher_deny: [],
      },
      recipient: "all",
      channel: null,
    },
    conversation_id: "67667704-89d0-8011-91cf-e087902ad7f2",
    error: null,
  },
  c: 3,
};

b = {
  p: "/message/content/parts/0",
  o: "append",
  v: "很高兴见到你，有什么可以帮",
};

c = {
  p: "",
  o: "patch",
  v: [
    { p: "/message/status", o: "replace", v: "finished_successfully" },
    { p: "/message/end_turn", o: "replace", v: true },
  ],
};

d = {
  p: "",
  o: "patch",
  v: [
    { p: "/message/status", o: "replace", v: "finished_successfully" },
    { p: "/message/end_turn", o: "replace", v: true },
  ],
};
