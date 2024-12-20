import { SendIcon } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input, InputField } from "@/components/ui/input";
import { View } from "@/components/ui/view";

interface ChatMessageInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSend: () => void;
}

export function ChatMessageInput({ message, setMessage, onSend }: ChatMessageInputProps) {
  return (
    <View className="flex-row items-center gap-2 p-2 bg-background-0">
      <Input className="flex-1">
        <InputField
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          className="py-2"
        />
      </Input>
      <Button
        variant="solid"
        size="sm"
        onPress={onSend}
        disabled={!message.trim()}
        className="aspect-square p-2"
      >
        <Icon as={SendIcon} size="sm" className="text-typography-0" />
      </Button>
    </View>
  );
}
