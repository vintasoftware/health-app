import { useCallback } from "react";
import { FlatList, ListRenderItem } from "react-native";

import { useAvatars } from "@/hooks/useAvatars";
import type { ChatMessage } from "@/models/chat";

import { ChatMessageBubble } from "./ChatMessageBubble";
import { LoadingDots } from "./LoadingDots";

interface ChatMessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  selectedMessages?: Set<string>;
  onMessageSelect?: (messageId: string) => void;
  selectionEnabled?: boolean;
}

export function ChatMessageList({
  messages,
  loading,
  selectedMessages = new Set(),
  onMessageSelect,
  selectionEnabled = false,
}: ChatMessageListProps) {
  const { getAvatarURL } = useAvatars(messages.map((message) => message.avatarRef));

  const renderItem: ListRenderItem<ChatMessage> = useCallback(
    ({ item: message }) => (
      <ChatMessageBubble
        message={message}
        avatarURL={getAvatarURL(message.avatarRef)}
        selected={selectedMessages.has(message.id)}
        onSelect={onMessageSelect}
        selectionEnabled={selectionEnabled}
      />
    ),
    [getAvatarURL, selectedMessages, onMessageSelect, selectionEnabled],
  );

  return (
    <FlatList
      className="flex-1 bg-background-50"
      data={[...messages].reverse()}
      renderItem={renderItem}
      keyExtractor={(message) => message.id}
      showsVerticalScrollIndicator={true}
      initialNumToRender={15}
      windowSize={5}
      removeClippedSubviews
      inverted
      ListHeaderComponent={loading ? <LoadingDots /> : null}
    />
  );
}
