import type { Message } from "../completion/completion";
import { getTokenizer } from "../../setting/get-tokenizer";
import { extractText } from "../../utils/extract-text";

export const kDefaultChatStoreKey = "chat_history";
export const kDefaultTokenLimitRatio = 0.75;
export const kMaxContextWindow = 32000;

type ChatMemoryBufferOptions<T extends object = object> = {
  tokenLimit?: number;
  chatStoreKey?: string;
  chatHistory?: Message<T>[];
};

interface ChatStore<T extends object = object> {
  setMessages(key: string, messages: Message<T>[]): Promise<void> | void;
  getMessages(key: string): Promise<Message<T>[]> | Message<T>[];
  addMessage(key: string, message: Message<T>): Promise<void> | void;
  deleteMessages(key: string): Promise<void> | void;
}

class InMemoryChatStore<T extends object = object> implements ChatStore<T> {
  private store = new Map<string, Message<T>[]>();

  async setMessages(key: string, messages: Message<T>[]) {
    this.store.set(key, messages);
  }

  async getMessages(key: string) {
    return this.store.get(key) ?? [];
  }

  async addMessage(key: string, message: Message<T>) {
    const messages = (await this.getMessages(key)) ?? [];
    messages.push(message);
    this.store.set(key, messages);
  }

  async deleteMessages(key: string) {
    this.store.delete(key);
  }
}

export class ChatMemoryBuffer<T extends object = object> {
  private chatStoreKey: string;
  private tokenLimit: number;
  private store: ChatStore<T>;

  constructor(
    store?: ChatStore<T>,
    options?: Partial<ChatMemoryBufferOptions<T>>,
  ) {
    this.chatStoreKey = options?.chatStoreKey ?? kDefaultChatStoreKey;
    this.tokenLimit =
      options?.tokenLimit ??
      Math.ceil(kMaxContextWindow * kDefaultTokenLimitRatio);
    this.store = store ?? new InMemoryChatStore<T>();

    if (options?.chatHistory) {
      this.store.setMessages(this.chatStoreKey, options.chatHistory);
    }
  }

  async getAllMessages(): Promise<Message<T>[]> {
    return this.store.getMessages(this.chatStoreKey);
  }

  async put(message: Message<T>) {
    await this.store.addMessage(this.chatStoreKey, message);
  }

  async set(messages: Message<T>[]) {
    await this.store.setMessages(this.chatStoreKey, messages);
  }

  async reset() {
    await this.store.deleteMessages(this.chatStoreKey);
  }

  private async _tokenCountForMessages(
    messages: Message<T>[],
  ): Promise<number> {
    if (messages.length === 0) {
      return 0;
    }

    const tokenizer = getTokenizer();
    const str = messages.map((m) => extractText(m.content)).join(" ");
    return tokenizer.encode(str).length;
  }

  async getMessages(
    transientMessages?: Message<T>[],
    initialTokenCount: number = 0,
  ): Promise<Message<T>[]> {
    const messages = await this.getAllMessages();

    if (initialTokenCount > this.tokenLimit) {
      throw new Error("Initial token count exceeds token limit");
    }

    const messagesWithInput = transientMessages
      ? [...transientMessages, ...messages]
      : messages;

    let messageCount = messagesWithInput.length;
    let currentMessages = messagesWithInput.slice(-messageCount);
    let tokenCount =
      (await this._tokenCountForMessages(messagesWithInput)) +
      initialTokenCount;

    while (tokenCount > this.tokenLimit && messageCount > 1) {
      messageCount -= 1;
      if (messagesWithInput.at(-messageCount)!.role === "assistant") {
        messageCount -= 1;
      }
      currentMessages = messagesWithInput.slice(-messageCount);
      tokenCount =
        (await this._tokenCountForMessages(currentMessages)) +
        initialTokenCount;
    }

    if (tokenCount > this.tokenLimit && messageCount <= 0) {
      return [];
    }
    return messagesWithInput.slice(-messageCount);
  }
}
