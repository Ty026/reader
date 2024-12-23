"use client";

import { ChatInput } from "@/components/chat/chat-input";
import { useChat } from "./use-chat";
import { kGuideLineMessage } from "./guideline-message";
import { MessageCard } from "./message-card";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";
import { throttle } from "lodash";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { CopyX } from "lucide-react";

export default function DemoPage() {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new MutationObserver(
      throttle(() => {
        if (!containerRef.current) return;
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 200),
    );
    observer.observe(container, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
    };
  }, []);

  const chat = useChat({
    api: "/api/chat",
    initialMessages: [kGuideLineMessage],
    // initialInput: "本书面向的读者群体有哪些？",
    // initialInput: "本书成书的由来",
    // initialInput: "今世缘的六维进化密码",
    initialInput: "今世缘是如何构建其品质壁垒的？",
    onError: (_) => {
      toast({
        variant: "destructive",
        title: "Oops! 发生错误",
        description: "连接大模型失败，请稍后重试",
      });
    },
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="p-2 flex flex-shrink-0 border-b border-black/70 justify-between items-center bg-[#242629]">
        <div></div>
        <div className="text-lg">百亿酒业进化论</div>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="w-8 h-8 rounded-2xl"
                aria-label="Add new item"
                disabled={chat.isLoading}
                onClick={() => {
                  chat.setMessages([kGuideLineMessage]);
                }}
              >
                <CopyX size={16} strokeWidth={2} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="px-2 py-1 text-xs">
              清空聊天记录
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex-1 overflow-y-auto" ref={containerRef}>
        <div className="h-auto">
          {chat.messages.map((item) => (
            <MessageCard key={item.id} message={item} />
          ))}
          <div className="h-4"></div>
        </div>
      </div>
      <div className="p-2 flex-shrink-0">
        <ChatInput
          isLoading={chat.isLoading}
          onInputChange={chat.handleInputChange}
          input={chat.input}
          onSubmit={chat.handleSubmit}
          onStop={chat.stop}
        />
      </div>
    </div>
  );
}
