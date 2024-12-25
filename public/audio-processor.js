class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array();
    this.isVoiceActive = false;
    this.isRecording = true;
    this.port.onmessage = (e) => {
      if (e.data === "GET_DATA") {
        this.port.postMessage(this.buffer);
        this.port.postMessage("END_DATA");
      } else if (e.data === "STOP_DATA") {
        this.isRecording = false;
      }
    };
  }

  process(inputs, outputs) {
    if (!this.isRecording) return false;
    const input = inputs[0];
    if (input && input.length > 0) {
      const monoInput = input[0];
      const temp = new Float32Array(this.buffer.length + monoInput.length);
      temp.set(this.buffer);
      temp.set(monoInput, this.buffer.length);
      this.buffer = temp;
      const rms = calculateRMS(monoInput);
      this.isVoiceActive = rms > 0.03;
      this.port.postMessage({ isVoiceActive: this.isVoiceActive });
    }
    return true;
  }
}
const calculateRMS = (data) => {
  let rms = 0;
  for (let i = 0; i < data.length; i++) {
    rms += data[i] * data[i];
  }
  rms = Math.sqrt(rms / data.length);
  return rms;
};
registerProcessor("audio-processor", AudioProcessor);
