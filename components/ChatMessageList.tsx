import { useRef } from "react";
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
  const flatListRef = useRef<FlatList>(null);
  const { getAvatarURL } = useAvatars(messages.map((message) => message.avatarRef));

  const renderItem: ListRenderItem<ChatMessage> = ({ item: message }) => (
    <ChatMessageBubble
      key={message.id}
      message={message}
      avatarURL={getAvatarURL(message.avatarRef)}
    />
  );

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderItem}
      keyExtractor={(message) => message.id}
      className="flex-1 bg-background-50"
      onContentSizeChange={() => {
        // Scroll to bottom when content size changes (e.g. new message)
        flatListRef.current?.scrollToEnd({ animated: true });
      }}
      ListFooterComponent={loading ? <LoadingDots /> : null}
      showsVerticalScrollIndicator={true}
      initialNumToRender={15}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews
    />
  );
}
