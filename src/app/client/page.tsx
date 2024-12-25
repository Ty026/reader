"use client";

import { useEffect } from "react";

export default function ClientPage() {
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8083");
    ws.onopen = () => {
      console.log("open", Buffer.from("abc"));
      ws.send(Buffer.from("abc"));
      // ws.send("hello");
    };
    ws.onmessage = (e) => {
      console.log(e.data);
    };
    ws.onclose = () => {
      console.log("close");
    };
    ws.onerror = () => {
      console.log("error");
    };
    return () => {
      ws.close();
    };
  }, []);

  return <div>Client</div>;
}
