import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

interface RecorderState {
  isRecording: boolean;
  isError: boolean;
  errorMessage: string;
  voiceActive: boolean;
}

const SAMPLE_SIZE = 4096; // 每次发送的采样大小
const SAMPLE_RATE = 16000;

export const Recorder = ({ onData, active }: { active: boolean; onData: (samples: Int16Array) => void }) => {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isError: false,
    errorMessage: "",
    voiceActive: false,
  });

  const onDataCallbackRef = useRef((data: Int16Array) => active && onData(data));
  useEffect(() => {
    onDataCallbackRef.current = (data: Int16Array) => active && onData(data);
  }, [onData]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Int16Array[]>([]);
  const [audioContent, setAudioContent] = useState("");

  const cleanupResources = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  const handleAudioData = async (audioData: Float32Array) => {
    try {
      const resampledData = await resampleAudio(audioData, audioContextRef.current!.sampleRate, SAMPLE_RATE);
      const int16Data = float32ToInt16(resampledData);
      audioChunksRef.current.push(int16Data);
      onDataCallbackRef.current?.(int16Data);
    } catch (error) {
      console.error("Error processing audio data:", error);
    }
  };

  async function startRecording() {
    try {
      setState((prev) => ({
        ...prev,
        isRecording: true,
        isError: false,
        errorMessage: "",
      }));

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);

      await audioContext.audioWorklet.addModule("/audio-processor.js");
      const processor = new AudioWorkletNode(audioContext, "audio-processor");
      processorRef.current = processor;

      source.connect(processor);

      processor.port.onmessage = (e) => {
        if (e.data.audioData) {
          handleAudioData(e.data.audioData);
        } else if (e.data.isVoiceActive !== undefined) {
          setState((prev) => ({ ...prev, voiceActive: e.data.isVoiceActive }));
        }
      };
    } catch (e) {
      console.error(e);
      setState((prev) => ({
        ...prev,
        isError: true,
        errorMessage: "Failed to start recording",
        isRecording: false,
      }));
    }
  }

  async function stopRecording() {
    setState((prev) => ({ ...prev, isRecording: false }));
    if (processorRef.current) {
      processorRef.current.port.postMessage("STOP");
    }
    cleanupResources();
    const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
    const mergedData = new Int16Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunksRef.current) {
      mergedData.set(chunk, offset);
      offset += chunk.length;
    }

    const wavBlob = createWavBlob(mergedData, 16000);
    const audioContent = URL.createObjectURL(wavBlob);
    setAudioContent(audioContent);
  }

  return (
    <div className="recorder-container">
      {state.isError && <div className="error-message">{state.errorMessage}</div>}

      <Button onClick={state.isRecording ? stopRecording : startRecording} disabled={state.isError}>
        {state.isRecording ? "Stop" : "Start"}
      </Button>

      <div className={cn("text-black bg-red-500 h-8 w-8", active && "bg-green-500")}></div>
      <div
        className="voice-indicator"
        style={{
          width: "50px",
          height: "50px",
          borderRadius: "25px",
          backgroundColor: state.voiceActive ? "#4CAF50" : "#FF5252",
          transition: "background-color 0.1s ease-in-out",
          margin: "20px 0",
        }}
      />

      {audioContent && (
        <div className="audio-player">
          <audio src={audioContent} controls />
          <Button
            onClick={() => {
              const link = document.createElement("a");
              link.href = audioContent;
              link.download = `recording-${new Date().toISOString()}.wav`;
              link.click();
            }}
          >
            Download Recording
          </Button>
        </div>
      )}
    </div>
  );
};

async function resampleAudio(
  audioData: Float32Array,
  originalSampleRate: number,
  targetSampleRate: number,
): Promise<Float32Array> {
  if (originalSampleRate === targetSampleRate) {
    return audioData;
  }

  const offlineCtx = new OfflineAudioContext(
    1,
    (audioData.length * targetSampleRate) / originalSampleRate,
    targetSampleRate,
  );

  const buffer = offlineCtx.createBuffer(1, audioData.length, originalSampleRate);
  buffer.getChannelData(0).set(audioData);

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start();

  const renderedBuffer = await offlineCtx.startRendering();
  return renderedBuffer.getChannelData(0);
}

function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

function createWavBlob(samples: Int16Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // WAV Header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write audio data
  const offset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset + i * bytesPerSample, samples[i], true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
