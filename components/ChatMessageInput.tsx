import { SendIcon } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { TextareaResizable, TextareaResizableInput } from "@/components/ui/textarea-resizable";
import { View } from "@/components/ui/view";

interface ChatMessageInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSend: () => void;
}

export function ChatMessageInput({ message, setMessage, onSend }: ChatMessageInputProps) {
  return (
    <View className="flex-row items-center gap-2 bg-background-0 p-2">
      <TextareaResizable className="flex-1">
        <TextareaResizableInput
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          className="min-h-[44px] py-3"
        />
      </TextareaResizable>
      <Button
        variant="solid"
        onPress={onSend}
        disabled={!message.trim()}
        className="aspect-square min-h-[44px] min-w-[44px] p-2"
      >
        <Icon as={SendIcon} size="sm" className="text-typography-0" />
      </Button>
    </View>
  );
}
