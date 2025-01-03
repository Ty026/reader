import { LoaderCircle, Mic, MicOff } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ASR, useASR } from "./use-asr";

enum Status {
  kIdle = "idle",
  kLoading = "loading",
  kGenerating = "generating",
  kListening = "listening",
}

export type InputInterface = {
  listen: () => void;
};

const ChatInputImpl = (
  {
    input,
    onSubmit,
    onInputChange,
    onStop,
    isLoading,
    setInput,
  }: {
    input: string;
    onSubmit: (e: any) => void;
    onInputChange: (e: any) => void;
    onStop?: () => void;
    setInput?: (text: string) => void;
    isLoading: boolean;
  },
  ref: React.ForwardedRef<InputInterface>,
) => {
  const [status, setStatus] = React.useState<Status>(Status.kIdle);
  const showLoading = status === Status.kLoading || status === Status.kGenerating;
  const [isMicRequested, setIsMicRequested] = useState(false);
  const handleOnSend = () => {
    if (!isLoading) {
      formRef.current?.requestSubmit();
    } else {
      onStop?.();
    }
  };
  useEffect(() => {
    if (isLoading) setStatus(Status.kLoading);
    else setStatus(Status.kIdle);
  }, [isLoading]);

  const formRef = useRef<HTMLFormElement>(null);

  const asr = useASR({
    onRecognized: (sentence) => {
      setInput?.(sentence);
      setTimeout(() => {
        formRef.current?.requestSubmit();
      }, 10);
    },
  });

  const handleMicButtonClick = async () => {
    switch (asr.status) {
      case ASR.kIdle:
        setIsMicRequested(true);
        asr.start();
        break;

      case ASR.kUnListening: {
        asr.start();
        break;
      }
      case ASR.kListening: {
        setIsMicRequested(false);
        asr.stop();
      }
    }
  };

  const matchStatus = (...status: ASR[]) => {
    return status.includes(asr.status);
  };

  React.useImperativeHandle(ref, () => ({
    listen() {
      if (isMicRequested) asr.start();
    },
  }));

  return (
    <div className="border border-[#2f3133] flex rounded-lg bg-[#0c0e11]/50 p-2 m-[1px] gap-2 items-center">
      <div>
        <Button
          onClick={handleMicButtonClick}
          className={cn(
            "rounded-full voice-indicator",
            "w-8 h-8",
            asr.voiceActive && "active",
            matchStatus(ASR.kListening, ASR.kUnListening) && "bg-red-500 hover:bg-red-500",
          )}
          variant="outline"
          aria-label="Add new item"
        >
          {matchStatus(ASR.kIdle, ASR.kListening) && <Mic size={12} strokeWidth={2} aria-hidden="true" />}
          {matchStatus(ASR.kLoading) && (
            <LoaderCircle size={12} strokeWidth={2} aria-hidden="true" className="-ms-1 animate-spin" />
          )}
          {matchStatus(ASR.kUnListening) && <MicOff size={12} strokeWidth={2} aria-hidden="true" />}
        </Button>
      </div>
      <div className="flex-1">
        <form onSubmit={onSubmit} ref={formRef}>
          <Input
            placeholder="问点什么"
            value={input}
            onChange={onInputChange}
            className="border-none focus-visible:ring-0 ring-0 text-sm"
          />
        </form>
      </div>
      <div>
        <Button variant="secondary" className="w-22" onClick={handleOnSend}>
          {showLoading && <LoaderCircle className="-ms-1 animate-spin" size={16} strokeWidth={2} aria-hidden="true" />}
          {isLoading ? "停止" : "发送"}
        </Button>
      </div>
    </div>
  );
};

export const ChatInput = React.forwardRef(ChatInputImpl);
