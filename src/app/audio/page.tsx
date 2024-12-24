"use client";

import { Button } from "@/components/ui/button";
import { useAudioRecognize } from "./use-audio-recognize";

export default function AudioPage() {
  const { connect, close, send, connected } = useAudioRecognize({
    url: "ws://localhost:8083",
  });

  const sendString = () => {
    send("hello");
  };
  const sendBinary = () => {
    send(Buffer.from("hello"));
  };
  return (
    <div className="space-x-2 p-4">
      <Button disabled={connected} onClick={connect}>
        Connect
      </Button>
      <Button onClick={close} disabled={!connected}>
        Close
      </Button>
      <Button onClick={sendString}>Send String</Button>
      <Button onClick={sendBinary}>Send Binary</Button>
    </div>
  );
}
