type Role = "assistant" | "user" | "tool";
type MessageStatus = "in_progress" | "finished_successfully";
type Content =
  | {
      content_type: "text";
      parts: string[];
    }
  | {
      content_type: "code";
      language: string;
      response_format_name: string | null;
      text: string;
    }
  | {
      content_type: "execution_output";
      text: string;
    };

type Pack = {
  message: {
    id: string;
    author: { role: Role; name: string | null; metadata: object };
    create_time: Date | null;
    update_time: Date | null;
    content: Content;
    status: MessageStatus;
    end_turn: boolean | null;
    metadata: {
      message_type: "next" | null;
      parent_id: string | null;
    };
    recipient: string;
  };
  conversation_id: string;
  error: string | null;
};
