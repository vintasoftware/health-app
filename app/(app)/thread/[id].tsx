import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChatHeader } from "@/components/ChatHeader";
import { ChatMessageInput } from "@/components/ChatMessageInput";
import { ChatMessageList } from "@/components/ChatMessageList";
import { Spinner } from "@/components/ui/spinner";
import { useChat } from "@/contexts/ChatContext";

export default function ThreadPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const {
    isLoadingMessages,
    threadMessages: messages,
    message,
    setMessage,
    sendMessage,
    markMessageAsRead,
    selectThread,
  } = useChat();

  // Set current thread when page loads
  useEffect(() => {
    selectThread(id);
    setIsLoading(false);
  }, [id, selectThread]);

  // Mark all unread messages as read
  useEffect(() => {
    messages.forEach((message) => {
      if (!message.read) {
        markMessageAsRead(message.id);
      }
    });
  }, [messages, markMessageAsRead]);

  if (isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Spinner size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-background-50" style={{ flex: 1 }}>
      <ChatHeader />
      <ChatMessageList messages={messages} loading={isLoadingMessages} />
      <ChatMessageInput message={message} setMessage={setMessage} onSend={sendMessage} />
    </SafeAreaView>
  );
}
