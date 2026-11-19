"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { AssistantReply } from "@/lib/assistant/contracts";

export type IshakiroChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  reply?: AssistantReply;
};

type IshakiroConversationValue = {
  messages: IshakiroChatMessage[];
  setMessages: Dispatch<SetStateAction<IshakiroChatMessage[]>>;
  conversationContext: AssistantReply["context"];
  setConversationContext: Dispatch<SetStateAction<AssistantReply["context"]>>;
};

const IshakiroConversationContext = createContext<IshakiroConversationValue | null>(null);

export function IshakiroConversationProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<IshakiroChatMessage[]>([]);
  const [conversationContext, setConversationContext] = useState<AssistantReply["context"]>(null);

  return (
    <IshakiroConversationContext.Provider
      value={{ messages, setMessages, conversationContext, setConversationContext }}
    >
      {children}
    </IshakiroConversationContext.Provider>
  );
}

export function useIshakiroConversation(): IshakiroConversationValue {
  const value = useContext(IshakiroConversationContext);
  if (!value) {
    throw new Error("useIshakiroConversation must be used within IshakiroConversationProvider");
  }
  return value;
}
