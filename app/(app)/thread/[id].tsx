import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChatHeader } from "@/components/ChatHeader";
import { ChatMessageInput } from "@/components/ChatMessageInput";
import { ChatMessageList } from "@/components/ChatMessageList";
import { Spinner } from "@/components/ui/spinner";
import { useChat } from "@/contexts/ChatContext";

export default function ThreadPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    isLoadingMessages,
    message,
    setMessage,
    sendMessage,
    markMessageAsRead,
    selectThread,
    currentThread,
  } = useChat();

  // Set current thread when page loads
  useEffect(() => {
    selectThread(id);
  }, [id, selectThread]);

  // Mark all unread messages as read
  useEffect(() => {
    if (!currentThread) return;
    currentThread.messages.forEach((message) => {
      if (!message.read) {
        markMessageAsRead(message.id);
      }
    });
  }, [currentThread, markMessageAsRead]);

  if (!currentThread) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <Spinner size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <ChatHeader currentThread={currentThread} />
      <ChatMessageList messages={currentThread.messages} loading={isLoadingMessages} />
      <ChatMessageInput message={message} setMessage={setMessage} onSend={sendMessage} />
    </SafeAreaView>
  );
}
