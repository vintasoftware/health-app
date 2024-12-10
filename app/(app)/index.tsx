import { ActivityIndicator, SafeAreaView, View, StyleSheet } from "react-native";
import { useMedplum } from "@medplum/react-hooks";
import { TextInput, Surface, IconButton, Text, Avatar, useTheme } from "react-native-paper";
import { useState } from "react";
import { ScrollView } from "react-native-gesture-handler";

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
  header: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
  },
  headerText: {
    marginLeft: 12,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messagesContentContainer: {
    gap: 8,
  },
  messageWrapper: {
    maxWidth: "80%",
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
  },
  timestamp: {
    opacity: 0.7,
    marginTop: 4,
  },
  inputContainer: {
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
  },
});

export default function Index() {
  const medplum = useMedplum();
  const profile = medplum.getProfile();
  const theme = useTheme();
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
      {/* Chat Header */}
      <Surface style={styles.header}>
        <Avatar.Icon size={40} icon="doctor" />
        <View style={styles.headerText}>
          <Text variant="titleMedium">Dr. Smith</Text>
          <Text variant="bodySmall">Online</Text>
        </View>
      </Surface>

      {/* Messages */}
      <ScrollView
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContentContainer}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageWrapper,
              { alignSelf: msg.sender === "patient" ? "flex-end" : "flex-start" },
            ]}
          >
            <Surface
              style={[
                styles.messageBubble,
                {
                  backgroundColor:
                    msg.sender === "patient" ? theme.colors.primary : theme.colors.surfaceVariant,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    msg.sender === "patient"
                      ? theme.colors.onPrimary
                      : theme.colors.onSurfaceVariant,
                }}
              >
                {msg.text}
              </Text>
              <Text
                variant="bodySmall"
                style={[
                  styles.timestamp,
                  {
                    color:
                      msg.sender === "patient"
                        ? theme.colors.onPrimary
                        : theme.colors.onSurfaceVariant,
                  },
                ]}
              >
                {msg.timestamp}
              </Text>
            </Surface>
          </View>
        ))}
      </ScrollView>

      {/* Message Input */}
      <Surface style={styles.inputContainer}>
        <TextInput
          mode="outlined"
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          style={styles.input}
        />
        <IconButton icon="send" mode="contained" onPress={sendMessage} disabled={!message.trim()} />
      </Surface>
    </SafeAreaView>
  );
}
