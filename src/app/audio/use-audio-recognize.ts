import React from "react";

type UseAudioRecognizeOptions = {
  url: string;
  onConnectionReady?: () => void;
  onRecognized?: (text: string) => void;
};

enum ServerMessageType {
  // successfully connected to the upstream service
  kHello = "hello",

  // ready to start recognizing
  kReadyToRecognize = "ready_to_recognize",

  // an complete sentence has been recognized
  kSentenceDefinite = "sentence_definite",
}

type ServerPayload = {
  type: ServerMessageType;
  sentence: string;
} & {};

export const useAudioRecognize = ({ url, onConnectionReady, onRecognized }: UseAudioRecognizeOptions) => {
  const [feedable, setFeedable] = React.useState(false);
  const wsRef = React.useRef<WebSocket | null>(null);
  const onMessage = (e: MessageEvent) => {
    const payload = JSON.parse(e.data) as ServerPayload;
    switch (payload.type) {
      case ServerMessageType.kHello:
        onConnectionReady?.();
        break;
      case ServerMessageType.kReadyToRecognize:
        console.info("ok, we can feed the samples to recognizer");
        setFeedable(true);
        break;
      case ServerMessageType.kSentenceDefinite:
        setFeedable(false);
        onRecognized?.(payload.sentence);
        break;
    }
  };
  const [connected, setConnected] = React.useState(false);
  const connect = React.useCallback(() => {
    if (wsRef.current) return;
    const conn = new WebSocket(url);
    wsRef.current = conn;
    conn.onopen = () => {
      setConnected(true);
    };
    conn.onmessage = (e) => onMessage(e);
    conn.onclose = () => {
      wsRef.current = null;
      setConnected(false);
    };
  }, []);
  const close = React.useCallback(() => {
    wsRef.current?.close();
    setFeedable(false);
    setConnected(false);
  }, []);
  const send = React.useCallback((data: string | ArrayBufferLike | ArrayBufferView) => {
    if (!wsRef.current) return;
    wsRef.current.send(data);
  }, []);

  const startRecognizing = React.useCallback(() => {
    send(JSON.stringify({ type: "start" }));
  }, []);
  return {
    connect,
    connected,
    close,
    send,
    startRecognizing,
    feedable,
  };
};
