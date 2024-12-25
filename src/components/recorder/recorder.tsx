import { useRef, useState } from "react";
import { Button } from "../ui/button";

export const Recorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  let audioContext: AudioContext;
  let processorRef = useRef<AudioWorkletNode>(null);

  async function startRecording() {
    setIsRecording(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      await audioContext.audioWorklet.addModule("/audio-processor.js");
      processorRef.current = new AudioWorkletNode(
        audioContext,
        "audio-processor",
      );

      source.connect(processorRef.current);
      processorRef.current.connect(audioContext.destination);

      processorRef.current.port.onmessage = (e) => {
        if (e.data && e.data.isVoiceActive !== undefined) {
          setVoiceActive(e.data.isVoiceActive);
          updateAnimation();
        }
      };
      console.log(processorRef);
    } catch (e) {
      console.log(e);
    }
  }

  async function updateAnimation() {
    // console.log("updateAnimation");
  }

  async function getAudioBufferFromProcessor(processor: AudioWorkletNode) {
    return new Promise<Float32Array>((resolve) => {
      let buffer = new Float32Array();
      let allDataReceived = false;

      const messageHandler = (e: MessageEvent) => {
        if (e.data === "END_DATA") {
          allDataReceived = true;
          processor.port.removeEventListener("message", messageHandler);
          console.log("remove");
          resolve(buffer);
        } else if (e.data instanceof Float32Array) {
          const incomingData = new Float32Array(e.data);
          const temp = new Float32Array(buffer.length + incomingData.length);
          temp.set(buffer);
          temp.set(incomingData, buffer.length);
          buffer = temp;
        }
      };

      processor.port.addEventListener("message", messageHandler);
      processor.port.postMessage("GET_DATA");
    });
  }

  async function stopRecording() {
    setIsRecording(false);
    if (processorRef.current) {
      processorRef.current.port.postMessage("STOP_DATA");
    }
    const audioBuffer = await getAudioBufferFromProcessor(
      processorRef.current!,
    );
    console.log(audioBuffer);
    // const wavBlob = createWavBlob(audioBuffer, audioContext.sampleRate, 1);
  }

  function createWavBlob(
    audioData: Float32Array,
    _sampleRate: number,
    _numChannels: number,
  ): Blob {
    const dataLength = audioData.length * 2;
    const buffer = new ArrayBuffer(44 + dataLength);
    return new Blob([buffer], { type: "audio/wav" });
  }

  return (
    <div>
      <Button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? "Recording" : "Start"}
      </Button>
      <div
        style={{
          width: "100px",
          height: "100px",
          backgroundColor: voiceActive ? "green" : "red",
          transition: "background-color 0.1s ease-in-out",
        }}
      ></div>
    </div>
  );
};
