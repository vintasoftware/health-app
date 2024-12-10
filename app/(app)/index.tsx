import { ActivityIndicator, SafeAreaView, StyleSheet } from "react-native";
import { useMedplum } from "@medplum/react-hooks";
import { useState } from "react";
import { ChatHeader } from "@/components/ChatHeader";
import { ChatMessageList } from "@/components/ChatMessageList";
import { ChatMessageInput } from "@/components/ChatMessageInput";

// Mock data for demonstration
const MOCK_MESSAGES = [
  {
    id: 1,
    text: "Hello, how can I help you today?",
    sender: "doctor",
    timestamp: "10:00 AM",
  },
  {
    id: 2,
    text: "I've been having headaches for the past few days",
    sender: "patient",
    timestamp: "10:01 AM",
  },
  {
    id: 3,
    text: "How severe are these headaches on a scale of 1-10?",
    sender: "doctor",
    timestamp: "10:02 AM",
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function Index() {
  const medplum = useMedplum();
  const profile = medplum.getProfile();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(MOCK_MESSAGES);

  const sendMessage = () => {
    if (message.trim()) {
      setMessages([
        ...messages,
        {
          id: messages.length + 1,
          text: message,
          sender: "patient",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
      setMessage("");
    }
  };

  if (!profile) return <ActivityIndicator />;

  return (
    <SafeAreaView style={styles.container}>
      <ChatHeader />
      <ChatMessageList messages={messages} />
      <ChatMessageInput message={message} setMessage={setMessage} onSend={sendMessage} />
    </SafeAreaView>
  );
}
