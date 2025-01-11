import { useMedplumProfile } from "@medplum/react-hooks";
import { UserRound } from "lucide-react-native";
import { View } from "react-native";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { ChatMessage } from "@/models/chat";
import { formatTime } from "@/utils/datetime";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  avatarURL?: string | null;
}

export function ChatMessageBubble({ message, avatarURL }: ChatMessageBubbleProps) {
  const profile = useMedplumProfile();

  const isPatientMessage = message.senderType === "Patient";
  const isCurrentUser = message.senderType === profile?.resourceType;
  const wrapperAlignment = isCurrentUser ? "self-end" : "self-start";
  const bubbleColor = isPatientMessage ? "bg-secondary-100" : "bg-tertiary-200";
  const borderColor = isPatientMessage ? "border-secondary-200" : "border-tertiary-300";
  const flexDirection = isCurrentUser ? "flex-row-reverse" : "flex-row";

  return (
    <View className={`mx-2 max-w-[80%] p-2 ${wrapperAlignment}`}>
      <View className={`${flexDirection} items-end gap-2`}>
        <Avatar size="sm" className="border border-primary-200">
          <Icon as={UserRound} size="sm" className="stroke-white" />
          {avatarURL && <AvatarImage source={{ uri: avatarURL }} />}
        </Avatar>
        <View className={`rounded-xl border p-3 ${bubbleColor} ${borderColor}`}>
          <Text className="text-typography-900">{message.text}</Text>
          <Text className="text-xs text-typography-600">{formatTime(message.sentAt)}</Text>
        </View>
      </View>
    </View>
  );
}
