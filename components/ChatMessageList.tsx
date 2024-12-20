import { ScrollView } from "react-native-gesture-handler";

import type { ChatMessage } from "@/types/chat";

import { ChatMessageBubble } from "./ChatMessageBubble";
import { LoadingDots } from "./LoadingDots";

interface ChatMessageListProps {
  messages: ChatMessage[];
  loading: boolean;
}

export function ChatMessageList({ messages, loading }: ChatMessageListProps) {
  return (
    <ScrollView className="flex-1 p-4" contentContainerClassName="gap-2">
      {messages.map((message) => (
        <ChatMessageBubble key={message.id} message={message} />
      ))}
      {loading && <LoadingDots />}
    </ScrollView>
  );
}
