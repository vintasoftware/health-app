import { useMedplumProfile } from "@medplum/react-hooks";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import type { ChatMessage } from "@/types/chat";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message: msg }: ChatMessageBubbleProps) {
  const profile = useMedplumProfile();

  const isCurrentUser = msg.senderType === profile?.resourceType;
  const wrapperAlignment = isCurrentUser ? "self-end" : "self-start";
  const bubbleColor = isCurrentUser ? "bg-info-500" : "bg-background-100";
  const textColor = isCurrentUser ? "text-typography-0" : "text-typography-900";

  return (
    <View className={`mx-2 max-w-[80%] px-2 pb-2 ${wrapperAlignment}`}>
      <View className={`rounded-xl p-3 ${bubbleColor}`}>
        <Text className={textColor}>{msg.text}</Text>
        <Text className={`mt-1 text-sm opacity-70 ${textColor}`}>{msg.timestamp}</Text>
      </View>
    </View>
  );
}
