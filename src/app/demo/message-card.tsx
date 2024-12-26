import { Message } from "./types";
import Markdown from "react-markdown";
import styles from "./style.module.css";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const MessageCard = ({ message }: { message: Message }) => {
  return (
    <div className="m-3 mt-2 mb-0 text-sm">
      {message.role === "user" && (
        <div className="flex justify-end ml-8">
          <div className="bg-[#acb7ff]/75 rounded-2xl p-3 text-black py-2">
            <Markdown>{message.content}</Markdown>
          </div>
        </div>
      )}
      {message.role === "assistant" && (
        <div className="flex ml-0">
          <div>
            <Avatar>
              <AvatarImage src="/avatar.png" alt="方明" />
              <AvatarFallback>FM</AvatarFallback>
            </Avatar>
          </div>

          <div
            className={cn(
              "text-sm p-4  bg-white/75 rounded-2xl ml-2 text-black py-2 flex-1",
              message.status === "in_progress" &&
                (message.content
                  ? styles.blink_cur_head
                  : styles.blink_cur_tail),
            )}
          >
            {message.status === "preprocessing" && (
              <div className="thinking-bubble px-2 py-1 mb-0 mt-[5px]">
                <div className="text-black/70 thinking-text">
                  💭 容我思考片刻
                </div>
                <div className="shine"></div>
              </div>
            )}
            <Markdown className={cn(styles.markdown)}>
              {message.content}
            </Markdown>
          </div>
        </div>
      )}
    </div>
  );
};
