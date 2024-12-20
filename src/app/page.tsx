"use client";
import { useChat } from "@/ai-stub/use-chat";
import { Input } from "@/components/ui/input";

export default function Home() {
  const { input, handleSubmit, isLoading, handleInputChange, messages } =
    useChat({
      api: "/api/chat",
      streamProtocol: "data",
    });

  console.log(messages);
  // const handleSubmit = async () => {

  // const res = await fetch("/api/chat", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({ query: "你好" }),
  // });
  // const stream = res.body;
  // if (!stream) return;
  // const reader = stream.getReader();
  // const decoder = new TextDecoder();
  // while (true) {
  //   const { done, value } = await reader.read();
  //   if (done) break;
  //   console.log(decoder.decode(value));
  // }
  // };
  return (
    <div>
      {messages.map((item) => {
        console.log(item);
        return (
          <div key={item.id}>
            <div className="border" />
            <div>{item.role}</div>
            <div>{item.content}</div>
          </div>
        );
      })}
      <form onSubmit={handleSubmit}>
        <Input
          value={input}
          placeholder="Send a message..."
          onChange={handleInputChange}
          disabled={isLoading}
        />
      </form>
    </div>
  );
}
