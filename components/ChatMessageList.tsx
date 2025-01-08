import { useRef } from "react";
import { ScrollView } from "react-native-gesture-handler";

import type { ChatMessage } from "@/types/chat";

import { ChatMessageBubble } from "./ChatMessageBubble";
import { LoadingDots } from "./LoadingDots";

interface ChatMessageListProps {
  messages: ChatMessage[];
  loading: boolean;
}

export function ChatMessageList({ messages, loading }: ChatMessageListProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <ScrollView
      ref={scrollViewRef}
      className="flex-1 bg-background-50"
      onContentSizeChange={() => {
        // Scroll to bottom when content size changes (e.g. new message)-]
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }}
    >
      {messages.map((message) => (
        <ChatMessageBubble key={message.id} message={message} />
      ))}
      {loading && <LoadingDots />}
    </ScrollView>
  );
}
