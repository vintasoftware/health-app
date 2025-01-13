import { useMedplumContext } from "@medplum/react-hooks";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChatHeader } from "@/components/ChatHeader";
import { ChatMessageInput } from "@/components/ChatMessageInput";
import { ChatMessageList } from "@/components/ChatMessageList";
import { Spinner } from "@/components/ui/spinner";
import { useAvatars } from "@/hooks/useAvatars";
import { useSingleThread } from "@/hooks/useSingleThread";

export default function ThreadPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useMedplumContext();
  const { thread, isLoadingThreads, isLoading, sendMessage, markMessageAsRead } = useSingleThread({
    threadId: id,
  });
  const { getAvatarURL, isLoading: isAvatarsLoading } = useAvatars([
    thread?.getAvatarRef({ profile }),
  ]);
  const [message, setMessage] = useState("");

  // If thread is not loading and the thread undefined, redirect to the index page
  useEffect(() => {
    if (!isLoadingThreads && !isLoading && !thread) {
      router.replace("/");
    }
  }, [isLoadingThreads, isLoading, thread]);

  // Mark all unread messages as read when the thread is loaded
  useEffect(() => {
    if (!thread) return;
    thread.messages.forEach((message) => {
      if (!message.read) {
        markMessageAsRead({ threadId: thread.id, messageId: message.id });
      }
    });
  }, [thread, markMessageAsRead]);

  const handleSendMessage = useCallback(async () => {
    if (!thread) return;
    const existingMessage = message;
    setMessage("");
    try {
      await sendMessage({ threadId: thread.id, message: existingMessage });
    } catch {
      setMessage(existingMessage);
    }
  }, [thread, message, sendMessage]);

  if (!thread || isAvatarsLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <Spinner size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <ChatHeader currentThread={thread} getAvatarURL={getAvatarURL} />
      <ChatMessageList messages={thread.messages} loading={isLoading} />
      <ChatMessageInput message={message} setMessage={setMessage} onSend={handleSendMessage} />
    </SafeAreaView>
  );
}
