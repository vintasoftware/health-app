import { StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import type { ChatMessage } from "@/types/chat";

import { ChatMessageBubble } from "./ChatMessageBubble";
import { LoadingDots } from "./LoadingDots";

interface ChatMessageListProps {
  messages: ChatMessage[];
  loading: boolean;
}

const styles = StyleSheet.create({
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messagesContentContainer: {
    gap: 8,
  },
});

export function ChatMessageList({ messages, loading }: ChatMessageListProps) {
  return (
    <ScrollView
      style={styles.messagesContainer}
      contentContainerStyle={styles.messagesContentContainer}
    >
      {messages.map((message) => (
        <ChatMessageBubble key={message.id} message={message} />
      ))}
      {loading && <LoadingDots />}
    </ScrollView>
  );
}
