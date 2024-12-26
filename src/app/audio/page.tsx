"use client";

import { Button } from "@/components/ui/button";
import { useAudioRecognize } from "./use-audio-recognize";
import { Recorder } from "@/components/recorder/recorder";
import { useRecording } from "./use-recording";

export default function AudioPage() {
  const { connect, close, send, feedable, connected, startRecognizing } = useAudioRecognize({
    url: "ws://localhost:8083",
    onConnectionReady: () => {},
  });

  const handleStartRecognize = () => {
    startRecognizing();
  };
  const recorder = useRecording({
    onSample: (data) => {
      if (feedable) {
        send(data);
      }
    },
  });
  return (
    <div>
      <div className="space-x-2 p-4">
        <Button disabled={connected} onClick={connect}>
          Connect
        </Button>
        <Button onClick={close} disabled={!connected}>
          Close
        </Button>
        <Button onClick={handleStartRecognize}>Start Recognizing</Button>
      </div>
      <div className="space-x-2 p-4">
        <Button onClick={recorder.start} disabled={recorder.isRecording}>
          Start Recording
        </Button>
        <Button onClick={recorder.stop} disabled={!recorder.isRecording}>
          Stop Recording
        </Button>
        <div className="text-red-500">{recorder.isRecording.toString()}</div>
      </div>
      <div>
        {/* <Recorder */}
        {/*   active={feedable} */}
        {/*   onData={(chunk) => { */}
        {/*     console.log(chunk.length, feedable); */}
        {/*     send(chunk); */}
        {/*   }} */}
        {/* /> */}
      </div>
    </div>
  );
}
