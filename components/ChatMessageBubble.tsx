import { useMedplumProfile } from "@medplum/react-hooks";
import { useVideoPlayer } from "expo-video";
import { VideoView } from "expo-video";
import { CirclePlay, FileDown, UserRound } from "lucide-react-native";
import { memo, useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Alert } from "react-native";

import { FullscreenImage } from "@/components/FullscreenImage";
import { LoadingButtonSpinner } from "@/components/LoadingButtonSpinner";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { ChatMessage } from "@/models/chat";
import type { AttachmentWithUrl } from "@/types/attachment";
import { formatTime } from "@/utils/datetime";
import { isMediaExpired, mediaKey, shareFile } from "@/utils/media";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  avatarURL?: string | null;
  selected?: boolean;
  onSelect?: (messageId: string) => void;
  selectionEnabled?: boolean;
}

const mediaStyles = StyleSheet.create({
  media: {
    width: 150,
    height: 266,
  },
});

const VideoAttachment = memo(
  ({ uri }: { uri: string }) => {
    const player = useVideoPlayer(uri, (player) => {
      player.pause();
      player.loop = true;
      player.bufferOptions = {
        // Reduce buffer for performance:
        minBufferForPlayback: 0,
        preferredForwardBufferDuration: 5,
      };
    });
    const videoRef = useRef<VideoView>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handlePlayPress = useCallback(() => {
      if (!player) return;
      setIsFullscreen(true);
      setTimeout(() => {
        videoRef.current?.enterFullscreen();
        player.play();
      }, 100);
    }, [player]);

    const handleExitFullscreen = useCallback(() => {
      player?.pause();
      setIsFullscreen(false);
    }, [player]);

    return (
      <View className="relative">
        <VideoView
          ref={videoRef}
          style={mediaStyles.media}
          player={player}
          nativeControls={isFullscreen}
          onFullscreenExit={handleExitFullscreen}
        />
        <Pressable
          onPress={handlePlayPress}
          className="absolute inset-0 items-center justify-center bg-background-dark/50 dark:bg-background-dark/90"
        >
          <Icon as={CirclePlay} size="xl" className="text-white" />
        </Pressable>
      </View>
    );
  },
  (oldProps: { uri: string }, newProps: { uri: string }) =>
    mediaKey(oldProps.uri) === mediaKey(newProps.uri) && !isMediaExpired(oldProps.uri),
);
VideoAttachment.displayName = "VideoAttachment";

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
        <LoadingButtonSpinner />
      ) : (
        <ButtonIcon as={FileDown} className="text-typography-100" />
      )}
      <ButtonText className="text-sm text-typography-100">
        {attachment.title || "Attachment"}
      </ButtonText>
    </Button>
  );
}

export function ChatMessageBubble({
  message,
  avatarURL,
  selected = false,
  onSelect,
  selectionEnabled = false,
}: ChatMessageBubbleProps) {
  const profile = useMedplumProfile();
  const isPatientMessage = message.senderType === "Patient";
  const isCurrentUser = message.senderType === profile?.resourceType;
  const hasImage = message.attachment?.contentType?.startsWith("image/");
  const hasVideo = message.attachment?.contentType?.startsWith("video/");

  const wrapperAlignment = isCurrentUser ? "self-end" : "self-start";
  const bubbleColor = isPatientMessage ? "bg-secondary-200" : "bg-tertiary-200";
  const borderColor = isPatientMessage ? "border-secondary-300" : "border-tertiary-300";
  const flexDirection = isCurrentUser ? "flex-row-reverse" : "flex-row";

  const handleLongPress = useCallback(() => {
    if (onSelect) {
      onSelect(message.id);
    }
  }, [message.id, onSelect]);

  const handlePress = useCallback(() => {
    if (selectionEnabled && onSelect) {
      onSelect(message.id);
    }
  }, [message.id, onSelect, selectionEnabled]);

  return (
    <Pressable
      className={`relative w-full ${wrapperAlignment}`}
      onLongPress={handleLongPress}
      onPress={handlePress}
      delayLongPress={200}
    >
      {/* Selection background */}
      {selected && <View className="absolute inset-0 bg-background-100" />}

      <View className={`max-w-[80%] ${wrapperAlignment} p-2 ${flexDirection} items-end gap-2`}>
        <Avatar
          size="sm"
          className={`border ${selected ? "border-primary-500" : "border-primary-200"}`}
        >
          <Icon as={UserRound} size="sm" className="stroke-typography-0" />
          {avatarURL && <AvatarImage source={{ uri: avatarURL }} />}
        </Avatar>
        <View
          className={`rounded-xl border p-3 ${bubbleColor} ${borderColor} ${
            selected ? "border-primary-500" : ""
          }`}
        >
          {message.attachment?.url && (
            <View className="mb-1">
              {hasImage ? (
                <FullscreenImage
                  uri={message.attachment.url}
                  alt={`Attachment ${message.attachment.title}`}
                  thumbnailWidth={mediaStyles.media.width}
                  thumbnailHeight={mediaStyles.media.height}
                />
              ) : hasVideo ? (
                <VideoAttachment uri={message.attachment.url} />
              ) : (
                <FileAttachment attachment={message.attachment as AttachmentWithUrl} />
              )}
            </View>
          )}
          {Boolean(message.text) && <Text className="text-typography-900">{message.text}</Text>}
          <Text className="mt-1 text-xs text-typography-600">{formatTime(message.sentAt)}</Text>
        </View>
      </View>
    </Pressable>
  );
}
