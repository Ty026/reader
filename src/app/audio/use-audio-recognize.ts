import React from "react";

type UseAudioRecognizeOptions = {
  url: string;
};

export const useAudioRecognize = ({ url }: UseAudioRecognizeOptions) => {
  const wsRef = React.useRef<WebSocket | null>(null);
  const [connected, setConnected] = React.useState(false);
  const connect = React.useCallback(() => {
    if (wsRef.current) return;
    const conn = new WebSocket(url);
    wsRef.current = conn;
    conn.onopen = () => {
      console.log("open");
      setConnected(true);
    };
    conn.onmessage = (e) => {
      console.log("message", e.data);
    };
    conn.onclose = () => {
      wsRef.current = null;
      setConnected(false);
    };
  }, []);
  const close = React.useCallback(() => {
    wsRef.current?.close();
  }, []);
  const send = React.useCallback(
    (data: string | ArrayBufferLike | ArrayBufferView) => {
      if (!wsRef.current) return;
      console.log("send", data);
      wsRef.current.send(data);
    },
    [],
  );
  return {
    connect,
    connected,
    close,
    send,
  };
};
