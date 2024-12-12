import { useLocalSearchParams } from "expo-router";
import { SafeAreaView, StyleSheet } from "react-native";
import { ActivityIndicator } from "react-native-paper";

import { ChatHeader } from "@/components/ChatHeader";
import { ChatMessageInput } from "@/components/ChatMessageInput";
import { ChatMessageList } from "@/components/ChatMessageList";
import { useChatMessages } from "@/hooks/headless/useChatMessages";

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
