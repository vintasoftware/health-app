import { StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { ChatMessage } from "./ChatMessage";

interface ChatMessageListProps {
  messages: {
    id: number;
    text: string;
    sender: string;
    timestamp: string;
  }[];
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

export function ChatMessageList({ messages }: ChatMessageListProps) {
  return (
    <ScrollView
      style={styles.messagesContainer}
      contentContainerStyle={styles.messagesContentContainer}
    >
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </ScrollView>
  );
}
