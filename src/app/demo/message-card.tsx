import { Message } from "./types";
import Markdown from "react-markdown";
import styles from "./style.module.css";
import { cn } from "@/lib/utils";

export const MessageCard = ({ message }: { message: Message }) => {
  return (
    <div className="m-3 mt-0 mb-0 text-sm">
      {message.role === "user" && (
        <div className="flex  justify-end ">
          <div className="bg-[#acb7ff] rounded-2xl p-3 text-black">
            <Markdown>{message.content}</Markdown>
          </div>
        </div>
      )}
      {message.role === "assistant" && (
        <div
          className={cn(
            "text-sm p-2 ",
            message.status === "in_progress" &&
              (message.content ? styles.blink_cur_head : styles.blink_cur_tail),
          )}
        >
          <Markdown className={cn(styles.markdown)}>{message.content}</Markdown>
        </div>
      )}
    </div>
  );
};
