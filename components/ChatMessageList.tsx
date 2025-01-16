import { useCallback } from "react";
import { FlatList, ListRenderItem } from "react-native";

import { useAvatars } from "@/hooks/useAvatars";
import type { ChatMessage } from "@/models/chat";

import { ChatMessageBubble } from "./ChatMessageBubble";
import { LoadingDots } from "./LoadingDots";

interface ChatMessageListProps {
  messages: ChatMessage[];
  loading: boolean;
}

export function ChatMessageList({ messages, loading }: ChatMessageListProps) {
  const { getAvatarURL } = useAvatars(messages.map((message) => message.avatarRef));

  const renderItem: ListRenderItem<ChatMessage> = useCallback(
    ({ item: message }) => (
      <ChatMessageBubble message={message} avatarURL={getAvatarURL(message.avatarRef)} />
    ),
    [getAvatarURL],
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
      ListFooterComponent={loading ? <LoadingDots /> : null}
    />
  );
}
