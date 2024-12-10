import { ActivityIndicator, SafeAreaView, StyleSheet } from "react-native";
import { ChatHeader } from "@/components/ChatHeader";
import { ChatMessageList } from "@/components/ChatMessageList";
import { ChatMessageInput } from "@/components/ChatMessageInput";
import { useChatMessages } from "@/hooks/headless/useChatMessages";
import { useLocalSearchParams } from "expo-router";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function ThreadPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { message, setMessage, messages, loading, sendMessage } = useChatMessages(id);

  if (loading) return <ActivityIndicator />;

  return (
    <SafeAreaView style={styles.container}>
      <ChatHeader />
      <ChatMessageList messages={messages} loading={loading} />
      <ChatMessageInput message={message} setMessage={setMessage} onSend={sendMessage} />
    </SafeAreaView>
  );
}
