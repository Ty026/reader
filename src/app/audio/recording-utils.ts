export async function reSampleAudio(
  audioData: Float32Array,
  originalSampleRate: number,
  targetSampleRate: number,
): Promise<Float32Array> {
  if (originalSampleRate === targetSampleRate) return audioData;
  const length = (audioData.length * targetSampleRate) / originalSampleRate;
  const offlineCtx = new OfflineAudioContext(1, length, targetSampleRate);

  const buffer = offlineCtx.createBuffer(1, audioData.length, originalSampleRate);
  buffer.getChannelData(0).set(audioData);

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start();

  const renderedBuffer = await offlineCtx.startRendering();
  return renderedBuffer.getChannelData(0);
}

export async function normalizeAudioSample(
  audioData: Float32Array,
  originalSampleRate: number,
  targetSampleRate: number,
) {
  const data = await reSampleAudio(audioData, originalSampleRate, targetSampleRate);
  return float32ToInt16(data);
}

function float32ToInt16(float32Array: Float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}
