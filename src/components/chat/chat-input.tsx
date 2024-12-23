import { LoaderCircle, Mic, MicOff } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import React, { useEffect } from "react";
import { cn } from "@/lib/utils";

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
}: {
  input: string;
  onSubmit: (e: any) => void;
  onInputChange: (e: any) => void;
  onStop?: () => void;
  isLoading: boolean;
}) => {
  const [status, setStatus] = React.useState<Status>(Status.kIdle);
  const showLoading =
    status === Status.kLoading || status === Status.kGenerating;
  const [micEnabled, setMicEnabled] = React.useState(false);
  const handleMicButtonClick = () => {
    if (micEnabled) {
      setMicEnabled(false);
    } else {
      setMicEnabled(true);
    }
  };
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
  return (
    <div className="border border-[#2f3133] flex rounded-lg bg-[#0c0e11] p-2 m-[1px] gap-2 items-center">
      {/* <div> */}
      {/* <Button */}
      {/*   onClick={handleMicButtonClick} */}
      {/*   className={cn( */}
      {/*     "rounded-full", */}
      {/*     "w-8 h-8", */}
      {/*     micEnabled && "bg-red-500 hover:bg-red-500", */}
      {/*   )} */}
      {/*   variant="outline" */}
      {/*   aria-label="Add new item" */}
      {/* > */}
      {/*   <Mic size={12} strokeWidth={2} aria-hidden="true" /> */}
      {/* </Button> */}
      {/* </div> */}
      <div className="flex-1">
        <form onSubmit={onSubmit}>
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
          {showLoading && (
            <LoaderCircle
              className="-ms-1 animate-spin"
              size={16}
              strokeWidth={2}
              aria-hidden="true"
            />
          )}
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

export const useChatInput = (
  onSendMessage: (message: string) => void,
): UseChatInputResult => {
  return {} as any;
};
