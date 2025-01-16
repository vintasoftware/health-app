import { ImageIcon, SendIcon } from "lucide-react-native";

import { TextareaResizable, TextareaResizableInput } from "@/components/textarea-resizable";
import { Button, ButtonIcon } from "@/components/ui/button";
import { View } from "@/components/ui/view";

interface ChatMessageInputProps {
  message: string;
  setMessage: (message: string) => void;
  onAttachment: () => Promise<void>;
  onSend: () => Promise<void>;
  isSending: boolean;
}

export function ChatMessageInput({
  message,
  setMessage,
  onAttachment,
  onSend,
  isSending,
}: ChatMessageInputProps) {
  return (
    <View className="flex-row items-center bg-background-0 p-3">
      <Button
        variant="outline"
        size="md"
        onPress={() => onAttachment()}
        disabled={isSending}
        className="mr-3 aspect-square border-outline-300 p-2 disabled:bg-background-300"
      >
        <ButtonIcon as={ImageIcon} size="md" className="text-typography-600" />
      </Button>
      <TextareaResizable size="md" className="flex-1">
        <TextareaResizableInput
          placeholder={isSending ? "Sending..." : "Type a message..."}
          value={message}
          onChangeText={setMessage}
          className="min-h-10 border-outline-300 px-3"
          editable={!isSending}
        />
      </TextareaResizable>
      <Button
        variant="solid"
        size="md"
        onPress={() => onSend()}
        disabled={!message.trim() || isSending}
        className="ml-3 aspect-square rounded-full bg-success-500 p-2 disabled:bg-background-300"
      >
        <ButtonIcon as={SendIcon} size="md" className="text-typography-0" />
      </Button>
    </View>
  );
}
