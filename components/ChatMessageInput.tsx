import { SendIcon } from "lucide-react-native";

import { TextareaResizable, TextareaResizableInput } from "@/components/textarea-resizable";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { View } from "@/components/ui/view";

interface ChatMessageInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSend: () => void;
}

export function ChatMessageInput({ message, setMessage, onSend }: ChatMessageInputProps) {
  return (
    <View className="flex-row items-center bg-background-0 p-3">
      <TextareaResizable className="flex-1">
        <TextareaResizableInput
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          className="min-h-10 px-3"
        />
      </TextareaResizable>
      <Button
        variant="solid"
        onPress={onSend}
        disabled={!message.trim()}
        className="ml-3 aspect-square rounded-full bg-success-500 p-2"
      >
        <Icon as={SendIcon} size="sm" className="text-typography-0" />
      </Button>
    </View>
  );
}
