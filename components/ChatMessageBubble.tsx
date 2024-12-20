import { useMedplumProfile } from "@medplum/react-hooks";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import type { ChatMessage } from "@/types/chat";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message: msg }: ChatMessageBubbleProps) {
  const profile = useMedplumProfile();

  const isCurrentUser = msg.sender === profile?.resourceType;
  const wrapperAlignment = isCurrentUser ? "self-end" : "self-start";
  const bubbleColor = isCurrentUser ? "bg-info-500" : "bg-background-100";
  const textColor = isCurrentUser ? "text-typography-0" : "text-typography-900";

  return (
    <View className={`max-w-[80%] pb-2 px-2 ${wrapperAlignment}`}>
      <View className={`p-3 rounded-xl ${bubbleColor}`}>
        <Text className={textColor}>{msg.text}</Text>
        <Text className={`text-sm opacity-70 mt-1 ${textColor}`}>{msg.timestamp}</Text>
      </View>
    </View>
  );
}
