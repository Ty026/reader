// audio-processor.js
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isRecording = true;
    this.isVoiceActive = false;
    this.sampleBuffer = new Float32Array();
    this.bufferSize = 4096 * 3; // 每次发送的采样大小
  }

  process(inputs, outputs) {
    if (!this.isRecording) return false;

    const input = inputs[0];
    if (input && input.length > 0) {
      const monoInput = input[0];

      // 将新的采样数据追加到缓冲区
      const newBuffer = new Float32Array(this.sampleBuffer.length + monoInput.length);
      newBuffer.set(this.sampleBuffer);
      newBuffer.set(monoInput, this.sampleBuffer.length);
      this.sampleBuffer = newBuffer;

      // 当累积的样本足够时，发送数据
      if (this.sampleBuffer.length >= this.bufferSize) {
        // 发送音频数据
        this.port.postMessage({
          audioData: this.sampleBuffer,
        });

        // 清空缓冲区
        this.sampleBuffer = new Float32Array();
      }

      // 检测声音活动
      const rms = this.calculateRMS(monoInput);
      const wasActive = this.isVoiceActive;
      this.isVoiceActive = rms > 0.03;

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
