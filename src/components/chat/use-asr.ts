import { useAudioRecognize } from "@/app/audio/use-audio-recognize";
import { useRecording } from "@/app/audio/use-recording";
import { connect } from "http2";
import React, { useEffect, useState } from "react";

export enum ASR {
  kIdle = "idle",
  kLoading = "loading",
  kListening = "listening",
  kUnListening = "unlistening",
}

export const useASR = ({ onRecognized }: { onRecognized?: (sentence: string) => void }) => {
  const [error, setError] = useState("");

  const { connected, connecting, send, connect, startRecognizing, feedable } = useAudioRecognize({
    url: process.env.NEXT_PUBLIC_ASR_URL ?? "wss://qg.hao-ai.cn:3500",
    onConnectionReady: () => {
      startRecognizing();
    },
    onRecognized: (sentence) => {
      onRecognized?.(sentence);
      setStatus(ASR.kUnListening);
    },
  });
  const recorder = useRecording({
    onSample: (data) => feedable && send(data),
  });
  const [voiceActive, setVoiceActive] = React.useState(false);
  const [status, setStatus] = React.useState<ASR>(ASR.kIdle);
  const start = React.useCallback(async () => {
    if (!recorder.isRecording) {
      setStatus(ASR.kLoading);
      const success = await recorder.start();
      if (!success) {
        setError("无法启动录音");
        setStatus(ASR.kIdle);
        return;
      }
      setStatus(ASR.kIdle);
    }
    if (connecting) return;
    if (!connected) {
      setStatus(ASR.kLoading);
      connect();
    } else {
      startRecognizing();
      setStatus(ASR.kListening);
    }
  }, [recorder.isRecording, connecting]);

  const stop = React.useCallback(() => {
    recorder.stop();
    setStatus(ASR.kIdle);
  }, [recorder]);

  useEffect(() => {
    if (feedable) setStatus(ASR.kListening);
  }, [feedable]);

  useEffect(() => {
    setVoiceActive(recorder.voiceActive);
  }, [recorder.voiceActive]);
  return {
    start,
    voiceActive,
    status,
    error,
    stop,
  };
};
