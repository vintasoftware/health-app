import { useMedplum } from "@medplum/react-hooks";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChatHeader } from "@/components/ChatHeader";
import { ChatMessageInput } from "@/components/ChatMessageInput";
import { ChatMessageList } from "@/components/ChatMessageList";
import { Spinner } from "@/components/ui/spinner";
import { useChatMessages } from "@/hooks/headless/useChatMessages";

export default function ThreadPage() {
  const medplum = useMedplum();
  const profile = medplum.getProfile();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { message, setMessage, messages, loading, sendMessage, markMessageAsRead } =
    useChatMessages({ threadId: id });

  // Mark all unread messages from others as read
  useEffect(() => {
    messages.forEach((message) => {
      if (!message.read && message.senderType !== profile?.resourceType) {
        markMessageAsRead(message.id);
      }
    });
  }, [messages, profile, markMessageAsRead]);

  if (loading) {
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
      <ChatMessageList messages={messages} loading={loading} />
      <ChatMessageInput message={message} setMessage={setMessage} onSend={sendMessage} />
    </SafeAreaView>
  );
}
