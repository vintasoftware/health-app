import { SafeAreaView, StyleSheet } from "react-native";
import { ChatHeader } from "@/components/ChatHeader";
import { ChatMessageList } from "@/components/ChatMessageList";
import { ChatMessageInput } from "@/components/ChatMessageInput";
import { useChatMessages } from "@/hooks/headless/useChatMessages";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator } from "react-native-paper";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function ThreadPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { message, setMessage, messages, loading, sendMessage } = useChatMessages(id);

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ChatHeader />
      <ChatMessageList messages={messages} loading={loading} />
      <ChatMessageInput message={message} setMessage={setMessage} onSend={sendMessage} />
    </SafeAreaView>
  );
}
