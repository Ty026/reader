import React from "react";
import { normalizeAudioSample } from "./recording-utils";

type UseRecorderParams = {
  onSample: (data: Int16Array) => void;
};

type RecorderState = {
  isRecording: boolean;
  isError: boolean;
  errorMessage: string;
  voiceActive: boolean;
};

const kSampleRate = 16000;

export const useRecording = ({ onSample }: UseRecorderParams) => {
  const [state, setState] = React.useState<RecorderState>({
    isRecording: false,
    isError: false,
    errorMessage: "",
    voiceActive: false,
  });
  const onSampleData = React.useRef<(data: Int16Array) => void>(onSample);
  React.useEffect(() => {
    onSampleData.current = onSample;
  }, [onSample]);

  const streamRef = React.useRef<MediaStream>(null);
  const audioContextRef = React.useRef<AudioContext>(null);
  const processorRef = React.useRef<AudioWorkletNode>(null);

  const cleanup = React.useCallback(() => {
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    streamRef.current?.getTracks()?.forEach((track) => track.stop());
    streamRef.current = null;
    audioContextRef.current = null;
    processorRef.current = null;
  }, []);

  const start = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);

      await audioContext.audioWorklet.addModule("/audio-processor.js");
      const processor = new AudioWorkletNode(audioContext, "audio-processor");
      processorRef.current = processor;

      source.connect(processor);

      processor.port.onmessage = async (e) => {
        if (e.data.audioData) {
          const data = await normalizeAudioSample(e.data.audioData, audioContextRef.current!.sampleRate, kSampleRate);
          onSampleData.current?.(data);
        } else if (e.data.isVoiceActive !== undefined) {
          setState((prev) => ({ ...prev, voiceActive: e.data.isVoiceActive }));
        }
      };

      setState((prev) => ({
        ...prev,
        isRecording: true,
        isError: false,
        errorMessage: "",
      }));
    } catch (err) {
      console.error(err);
      setState((prev) => ({
        ...prev,
        isError: true,
        errorMessage: "Failed to start recording",
        isRecording: false,
      }));
    }
  }, [setState]);

  const stop = React.useCallback(() => {
    setState((prev) => ({ ...prev, isRecording: false }));
    processorRef.current?.port?.postMessage("STOP");
    cleanup();
  }, []);

  return {
    start,
    stop,
    isError: state.isError,
    errorMessage: state.errorMessage,
    isRecording: state.isRecording,
    voiceActive: state.voiceActive,
  };
};
