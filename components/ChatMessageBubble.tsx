import { useMedplumProfile } from "@medplum/react-hooks";
import { FileDown, UserRound } from "lucide-react-native";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { Alert } from "react-native";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button, ButtonIcon, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";
import type { ChatMessage } from "@/models/chat";
import type { AttachmentWithUrl } from "@/types/attachment";
import { formatTime } from "@/utils/datetime";
import { shareFile } from "@/utils/media";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  avatarURL?: string | null;
}

function FileAttachment({ attachment }: { attachment: AttachmentWithUrl }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleShare = useCallback(async () => {
    setIsDownloading(true);
    try {
      await shareFile(attachment);
    } catch {
      Alert.alert("Error", "Failed to share file, please try again", [{ text: "OK" }]);
    } finally {
      setIsDownloading(false);
    }
  }, [attachment]);

  return (
    <Button
      className="bg-tertiary-500"
      variant="solid"
      onPress={handleShare}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <ButtonSpinner className="text-white" />
      ) : (
        <ButtonIcon as={FileDown} className="text-typography-600 text-white" />
      )}
      <ButtonText className="text-sm text-white">{attachment.title || "Attachment"}</ButtonText>
    </Button>
  );
}

export function ChatMessageBubble({ message, avatarURL }: ChatMessageBubbleProps) {
  const profile = useMedplumProfile();
  const isPatientMessage = message.senderType === "Patient";
  const isCurrentUser = message.senderType === profile?.resourceType;
  const hasImage = message.attachment?.contentType?.startsWith("image/");

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
          {message.attachment?.url && (
            <View className="mb-1">
              {hasImage ? (
                <Image
                  key={message.attachment.url}
                  source={message.attachment.url}
                  size="2xl"
                  resizeMode="contain"
                  alt={`Attachment ${message.attachment.title}`}
                />
              ) : (
                <FileAttachment attachment={message.attachment as AttachmentWithUrl} />
              )}
            </View>
          )}
          {message.text && <Text className="text-typography-900">{message.text}</Text>}
          <Text className="mt-1 text-xs text-typography-600">{formatTime(message.sentAt)}</Text>
        </View>
      </View>
    </View>
  );
}
