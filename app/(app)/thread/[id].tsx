import { useMedplumContext } from "@medplum/react-hooks";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, View } from "react-native";

import { ChatHeader } from "@/components/ChatHeader";
import { ChatMessageInput } from "@/components/ChatMessageInput";
import { ChatMessageList } from "@/components/ChatMessageList";
import { LoadingScreen } from "@/components/LoadingScreen";
import { MessageDeleteModal } from "@/components/MessageDeleteModal";
import { useAvatars } from "@/hooks/useAvatars";
import { useSingleThread } from "@/hooks/useSingleThread";

async function getAttachment() {
  try {
    // Request permissions if needed
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Please grant media library access to attach images and videos.",
      );
      return null;
    }

    // Pick media
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos", "livePhotos"],
      quality: 1,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      return result.assets[0];
    }
    return null;
  } catch (error) {
    Alert.alert("Error", "Failed to attach media. Please try again.");
    console.error("Error getting attachment:", error);
    return null;
  }
}

export default function ThreadPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useMedplumContext();
  const { thread, isLoadingThreads, isLoading, sendMessage, markMessageAsRead, deleteMessages } =
    useSingleThread({
      threadId: id,
    });
  const { getAvatarURL, isLoading: isAvatarsLoading } = useAvatars([
    thread?.getAvatarRef({ profile }),
  ]);
  const [message, setMessage] = useState("");
  const [isAttaching, setIsAttaching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // If thread is not loading and the thread undefined, redirect to the index page
  useEffect(() => {
    if (!isLoadingThreads && !isLoading && !thread) {
      router.replace("/");
    }
  }, [isLoadingThreads, isLoading, thread]);

  // Mark all unread messages as read when the thread is loaded
  useEffect(() => {
    if (!thread) return;
    thread.messages.forEach((message) => {
      if (!message.read) {
        markMessageAsRead({ threadId: thread.id, messageId: message.id });
      }
    });
  }, [thread, markMessageAsRead]);

  const handleSendMessage = useCallback(
    async (attachment?: ImagePicker.ImagePickerAsset) => {
      if (!thread) return;
      setIsSending(true);
      const existingMessage = message;
      setMessage("");

      try {
        await sendMessage({
          threadId: thread.id,
          message: existingMessage,
          attachment,
        });
      } catch {
        setMessage(existingMessage);
      } finally {
        setIsSending(false);
      }
    },
    [thread, message, sendMessage],
  );

  const handleAttachment = useCallback(async () => {
    if (!thread) return;
    setIsAttaching(true);
    const attachment = await getAttachment();
    setIsAttaching(false);
    if (attachment) {
      await handleSendMessage(attachment);
    }
  }, [thread, handleSendMessage]);

  const handleMessageSelect = useCallback((messageId: string) => {
    setSelectedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!thread) return;
    setIsDeleting(true);
    try {
      await deleteMessages({
        threadId: thread.id,
        messageIds: Array.from(selectedMessages),
      });
      setSelectedMessages(new Set());
    } catch (error) {
      console.error("Error deleting messages:", error);
      Alert.alert("Error", "Failed to delete messages. Please try again.");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  }, [thread, selectedMessages, deleteMessages]);

  const handleDeleteMessages = useCallback(() => {
    if (!thread || selectedMessages.size === 0) return;
    setIsDeleteModalOpen(true);
  }, [thread, selectedMessages]);

  const handleCancelSelection = useCallback(() => {
    setSelectedMessages(new Set());
  }, []);

  if (!thread || isAvatarsLoading) {
    return <LoadingScreen />;
  }

  return (
    <View className="flex-1 bg-background-50">
      <ChatHeader
        currentThread={thread}
        getAvatarURL={getAvatarURL}
        selectedCount={selectedMessages.size}
        onDelete={handleDeleteMessages}
        onCancelSelection={handleCancelSelection}
        isDeleting={isDeleting}
      />
      <ChatMessageList
        messages={thread.messages}
        loading={isSending || isLoading}
        selectedMessages={selectedMessages}
        onMessageSelect={handleMessageSelect}
        selectionEnabled={selectedMessages.size > 0}
      />
      <ChatMessageInput
        message={message}
        setMessage={setMessage}
        onAttachment={handleAttachment}
        onSend={handleSendMessage}
        isSending={isSending || isAttaching}
        disabled={selectedMessages.size > 0}
      />
      <MessageDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        selectedCount={selectedMessages.size}
        isDeleting={isDeleting}
      />
    </View>
  );
}
