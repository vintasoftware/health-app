import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChatHeader } from "@/components/ChatHeader";
import { ChatMessageInput } from "@/components/ChatMessageInput";
import { ChatMessageList } from "@/components/ChatMessageList";
import { Spinner } from "@/components/ui/spinner";
import { useChat } from "@/contexts/ChatContext";

export default function ThreadPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isLoadingMessages, sendMessage, markMessageAsRead, selectThread, currentThread } =
    useChat();
  const [message, setMessage] = useState("");

  // Set current thread when page loads
  useEffect(() => {
    if (currentThread?.id !== id) {
      selectThread(id);
    }
  }, [id, selectThread, currentThread]);

  // Mark all unread messages as read when the thread is loaded
  useEffect(() => {
    if (!currentThread) return;
    if (currentThread.id !== id) return;
    currentThread.messages.forEach((message) => {
      if (!message.read) {
        markMessageAsRead(message.id);
      }
    });
  }, [currentThread, id, markMessageAsRead]);

  const handleSendMessage = useCallback(async () => {
    const existingMessage = message;
    setMessage("");
    try {
      await sendMessage(existingMessage);
    } catch {
      setMessage(existingMessage);
    }
  }, [message, sendMessage]);

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
      <ChatMessageInput message={message} setMessage={setMessage} onSend={handleSendMessage} />
    </SafeAreaView>
  );
}
