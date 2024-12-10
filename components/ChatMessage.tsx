import { View, StyleSheet } from "react-native";
import { Surface, Text, useTheme } from "react-native-paper";

interface ChatMessageProps {
  message: {
    id: number;
    text: string;
    sender: string;
    timestamp: string;
  };
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

export function ChatMessage({ message: msg }: ChatMessageProps) {
  const theme = useTheme();

  return (
    <View
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
              msg.sender === "patient" ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
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
                msg.sender === "patient" ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
            },
          ]}
        >
          {msg.timestamp}
        </Text>
      </Surface>
    </View>
  );
}
