import { LoaderCircle, Mic, MicOff } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useRecording } from "@/app/audio/use-recording";
import { useAudioRecognize } from "@/app/audio/use-audio-recognize";

enum Status {
  kIdle = "idle",
  kLoading = "loading",
  kGenerating = "generating",
  kListening = "listening",
}

export const ChatInput = ({
  input,
  onSubmit,
  onInputChange,
  onStop,
  isLoading,
  setInput,
  seq,
}: {
  input: string;
  onSubmit: (e: any) => void;
  onInputChange: (e: any) => void;
  onStop?: () => void;
  setInput?: (text: string) => void;
  isLoading: boolean;
  seq: number;
}) => {
  const [status, setStatus] = React.useState<Status>(Status.kIdle);
  const showLoading = status === Status.kLoading || status === Status.kGenerating;
  const [micEnabled, setMicEnabled] = React.useState(false);
  const [isPending, setPending] = useState(false);
  const handleOnSend = (e: any) => {
    if (!isLoading) {
      onSubmit(e);
    } else {
      onStop?.();
    }
  };
  useEffect(() => {
    if (isLoading) setStatus(Status.kLoading);
    else setStatus(Status.kIdle);
  }, [isLoading]);

  const { connect, close, send, feedable, connected, startRecognizing } = useAudioRecognize({
    url: "ws://localhost:8083",
    onConnectionReady: () => {
      startRecognizing();
    },
    onRecognized: (sentence) => {
      setInput?.(sentence);
      setTimeout(() => {
        formRef.current?.requestSubmit();
      }, 100);
    },
  });

  const recorder = useRecording({
    onSample: (data) => {
      if (feedable) {
        send(data);
      }
    },
  });

  const formRef = useRef<HTMLFormElement>(null);

  const [recognizeEnabled, setRecognizeEnabled] = useState(false);

  const handleMicButtonClick = async () => {
    if (isPending) return;
    if (micEnabled) {
      setMicEnabled(false);
      setRecognizeEnabled(false);
      close();
      recorder.stop();
    } else {
      setMicEnabled(true);
      if (await recorder.start()) {
        setMicEnabled(true);
        connect();
      }
    }
    setPending(false);
  };

  useEffect(() => {
    if (!recognizeEnabled && feedable) setRecognizeEnabled(true);
  }, [feedable]);

  const isStaringRecognizing = micEnabled && !feedable;
  const isListening = feedable;

  useEffect(() => {
    console.log("seq", seq);
    console.log("micEnabled", micEnabled);
    console.log("connected", connected);
    console.log("feedable", feedable);
    if (seq > 0 && micEnabled && connected && !feedable) {
      startRecognizing();
    }
  }, [seq]);

  return (
    <div className="border border-[#2f3133] flex rounded-lg bg-[#0c0e11]/50 p-2 m-[1px] gap-2 items-center">
      <div>
        <Button
          onClick={handleMicButtonClick}
          className={cn(
            "rounded-full",
            "w-8 h-8",
            micEnabled && feedable && !isPending && "bg-red-500 hover:bg-red-500",
            "voice-indicator",
            recorder.voiceActive && "active",
          )}
          style={{
            transition: "background-color 0.5s ease-in-out",
          }}
          variant="outline"
          aria-label="Add new item"
        >
          {isStaringRecognizing ? (
            recognizeEnabled ? (
              <MicOff size={12} strokeWidth={2} aria-hidden="true" />
            ) : (
              <LoaderCircle className="-ms-1 animate-spin" size={12} strokeWidth={2} aria-hidden="true" />
            )
          ) : isListening ? (
            <Mic size={12} strokeWidth={2} aria-hidden="true" />
          ) : (
            micEnabled && <MicOff size={12} strokeWidth={2} aria-hidden="true" />
          )}
          {!micEnabled && <Mic size={12} strokeWidth={2} aria-hidden="true" />}
          {/* {!isPending && */}
          {/*   (feedable || !micEnabled ? ( */}
          {/*     <Mic size={12} strokeWidth={2} aria-hidden="true" /> */}
          {/*   ) : ( */}
          {/*   ))} */}
        </Button>
        {/* <div> */}
        {/*   {feedable.toString()} */}
        {/*   {micEnabled.toString()} */}
        {/*   {recognizeEnabled.toString()} */}
        {/* </div> */}
      </div>
      <div className="flex-1">
        <form onSubmit={onSubmit} ref={formRef}>
          <Input
            disabled={micEnabled}
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

interface UseChatInputResult {
  status: Status;
  inputProps: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  };
  onSend: () => void;
  showLoading: boolean;
}

export const useChatInput = (onSendMessage: (message: string) => void): UseChatInputResult => {
  return {} as any;
};
