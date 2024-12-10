import { ActivityIndicator, SafeAreaView, StyleSheet } from "react-native";
import { ChatHeader } from "@/components/ChatHeader";
import { ChatMessageList } from "@/components/ChatMessageList";
import { ChatMessageInput } from "@/components/ChatMessageInput";
import { useChatMessages } from "@/hooks/headless/useChatMessages";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function Index() {
  const { message, setMessage, messages, loading, sendMessage, patient } = useChatMessages();

  if (!patient || loading) return <ActivityIndicator />;

  return (
    <SafeAreaView style={styles.container}>
      <ChatHeader />
      <ChatMessageList messages={messages} />
      <ChatMessageInput message={message} setMessage={setMessage} onSend={sendMessage} />
    </SafeAreaView>
  );
}
