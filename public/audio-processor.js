// audio-processor.js
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isRecording = true;
    this.isVoiceActive = false;
    this.sampleBuffer = new Float32Array();
    this.bufferSize = 4096 * 3;
  }

  process(inputs, _outputs) {
    if (!this.isRecording) return false;

    const input = inputs[0];
    if (input && input.length > 0) {
      const monoInput = input[0];

      const newBuffer = new Float32Array(this.sampleBuffer.length + monoInput.length);
      newBuffer.set(this.sampleBuffer);
      newBuffer.set(monoInput, this.sampleBuffer.length);
      this.sampleBuffer = newBuffer;

      if (this.sampleBuffer.length >= this.bufferSize) {
        this.port.postMessage({
          audioData: this.sampleBuffer,
        });

        this.sampleBuffer = new Float32Array();
      }

      const rms = this.calculateRMS(monoInput);
      const wasActive = this.isVoiceActive;
      this.isVoiceActive = rms > 0.02;

      if (wasActive !== this.isVoiceActive) {
        this.port.postMessage({ isVoiceActive: this.isVoiceActive });
      }
    }

    return true;
  }

  calculateRMS(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }
}

registerProcessor("audio-processor", AudioProcessor);
