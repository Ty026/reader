"use client";

import { ChatInput } from "@/components/chat/chat-input";
import { useChat } from "./demo/use-chat";
import { kGuideLineMessage } from "./demo/guideline-message";
import { MessageCard } from "./demo/message-card";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from "react";
import { throttle } from "lodash";
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { CopyX } from "lucide-react";

const defaultQuestions = [
  "本书面向的读者群体有哪些？",
  "《百亿酒业进化论》成书的缘由",
  "今世缘的六维进化密码",
  "今世缘是如何构建其品质壁垒的？",
  "今世缘的文化基因是什么？",
  "今世缘如何在营销和传播上构建品牌价值？",
];

const initialInput = defaultQuestions[Math.floor(Math.random() * defaultQuestions.length)];

export default function HomePage() {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  let [seq, setSeq] = useState(0);

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
    initialInput,
    onError: (_) => {
      toast({
        variant: "destructive",
        title: "Oops! 发生错误",
        description: "连接大模型失败，请稍后重试",
      });
    },
    onFinish: () => {
      setSeq((s) => s + 1);
    },
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    document.documentElement.addEventListener(
      "click",
      () => {
        if (videoRef.current?.paused) videoRef.current?.play();
      },
      false,
    );
    document.addEventListener("WeixinJSBridgeReady", function onBridgeReady() {
      if (videoRef.current?.paused) videoRef.current?.play();
    });
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden relative px-2">
      {/* <Image */}
      {/*   src="/cover.png" */}
      {/*   width={568} */}
      {/*   height={1011} */}
      {/*   alt="cover" */}
      {/*   className="absolute top-0 left-0 min-w-full min-h-full object-cover z-0" */}
      {/* /> */}
      <video
        {...{
          playsInline: true,
          "webkit-playsinline": "true",
          "x5-playsinline": "true",
          "x-webkit-airplay": "true",
          "x5-video-player-type": "h5",
          "x5-video-orientation": "portraint",
          "x5-video-player-fullscreen": "true",
        }}
        autoPlay={true}
        loop
        muted
        preload="auto"
        poster="/cover.jpg"
        className="absolute top-0 left-0 min-w-full min-h-full object-cover z-1"
        ref={videoRef}
      >
        <source src="fangming.mp4" type="video/mp4" />
      </video>

      <div className="absolute right-1 top-1">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="w-8 h-8 rounded-2xl bg-background/70 p-0"
                aria-label="Add new item"
                disabled={chat.isLoading}
                onClick={() => {
                  chat.setMessages([kGuideLineMessage]);
                }}
              >
                <CopyX size={6} strokeWidth={2} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="px-2 py-1 text-xs">清空聊天记录</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex-1 overflow-y-auto mt-[350px] z-2 relative" ref={containerRef}>
        <div className="h-auto">
          {chat.messages.map((item) => (
            <MessageCard key={item.id} message={item} />
          ))}
          <div className="h-4"></div>
        </div>
      </div>
      <div className="p-2 flex-shrink-0 mb-5 z-2 relative">
        <ChatInput
          isLoading={chat.isLoading}
          onInputChange={chat.handleInputChange}
          input={chat.input}
          onSubmit={chat.handleSubmit}
          onStop={chat.stop}
          seq={seq}
          setInput={chat.setInput}
        />
      </div>
    </div>
  );
}
