import { useMedplumProfile } from "@medplum/react-hooks";
import { StyleSheet, View } from "react-native";
import { Surface, Text, useTheme } from "react-native-paper";

import type { ChatMessage } from "@/types/chat";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

const styles = StyleSheet.create({
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
});

export function ChatMessageBubble({ message: msg }: ChatMessageBubbleProps) {
  const theme = useTheme();
  const profile = useMedplumProfile();

  return (
    <View
      style={[
        styles.messageWrapper,
        { alignSelf: msg.sender === profile?.resourceType ? "flex-end" : "flex-start" },
      ]}
    >
      <Surface
        style={[
          styles.messageBubble,
          {
            backgroundColor:
              msg.sender === profile?.resourceType
                ? theme.colors.primary
                : theme.colors.surfaceVariant,
          },
        ]}
      >
        <Text
          style={{
            color:
              msg.sender === profile?.resourceType
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
                msg.sender === profile?.resourceType
                  ? theme.colors.onPrimary
                  : theme.colors.onSurfaceVariant,
            },
          ]}
        >
          {msg.timestamp}
        </Text>
      </Surface>
    </View>
  );
}
