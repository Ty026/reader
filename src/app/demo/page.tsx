"use client";

import { ChatInput } from "@/components/chat/chat-input";

export default function DemoPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-1 h-auto">1</div>
      <div className="p-2 flex-shrink-0">
        <ChatInput />
      </div>
    </div>
  );
}
