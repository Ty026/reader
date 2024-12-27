import React from "react";

enum ASRStatus {
  kIdle = "idle",
  kLoading = "loading",
  kListening = "generating",
  kUnListening = "listening",
}

export const useASR = () => {
  const [isLearning, setLearning] = React.useState(false);
  const [voiceActive, setVoiceActive] = React.useState(false);
  const [status, setStatus] = React.useState<ASRStatus>(ASRStatus.kIdle);
  const start = React.useCallback(() => {}, []);
  return {
    start,
    isLearning,
    voiceActive,
    status,
  };
};
