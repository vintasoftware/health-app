import { StyleSheet } from "react-native";
import { IconButton, Surface, TextInput } from "react-native-paper";

interface ChatMessageInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSend: () => void;
}

const styles = StyleSheet.create({
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

export function ChatMessageInput({ message, setMessage, onSend }: ChatMessageInputProps) {
  return (
    <Surface style={styles.inputContainer}>
      <TextInput
        mode="outlined"
        placeholder="Type a message..."
        value={message}
        onChangeText={setMessage}
        style={styles.input}
      />
      <IconButton icon="send" mode="contained" onPress={onSend} disabled={!message.trim()} />
    </Surface>
  );
}
