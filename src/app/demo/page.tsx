"use client";

import { ChatInput } from "@/components/chat/chat-input";
import { useChat } from "./use-chat";

export default function DemoPage() {
  const { handleSubmit, input, handleInputChange, messages } = useChat({
    api: "/api/chat",
  });
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-1 h-auto">
        {messages.map((item) => (
          <div key={item.id} className="p-1 text-xs">
            <div>{item.role}</div>
            <div>{item.content}</div>
          </div>
        ))}
      </div>
      <div className="p-2 flex-shrink-0">
        <ChatInput
          onInputChange={handleInputChange}
          input={input}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
