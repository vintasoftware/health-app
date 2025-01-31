import { useEffect, useRef } from "react";
import { useContextSelector } from "use-context-selector";

import { ChatContext } from "@/contexts/ChatContext";

export interface UseSingleThreadProps {
  threadId: string;
}

export function useSingleThread({ threadId }: UseSingleThreadProps) {
  const receiveThread = useContextSelector(ChatContext, (state) => state.receiveThread);
  const isLoadingThreads = useContextSelector(ChatContext, (state) => state.isLoadingThreads);
  const isLoading = useContextSelector(ChatContext, (state) =>
    state.isLoadingMessagesMap.get(threadId),
  );
  const thread = useContextSelector(ChatContext, (state) =>
    state.threads.find((t) => t.id === threadId),
  );
  const sendMessage = useContextSelector(ChatContext, (state) => state.sendMessage);
  const markMessageAsRead = useContextSelector(ChatContext, (state) => state.markMessageAsRead);
  const deleteMessages = useContextSelector(ChatContext, (state) => state.deleteMessages);
  const previousReconnectingRef = useRef(false);
  const reconnecting = useContextSelector(ChatContext, (state) => state.reconnecting);

  // Fetch the thread on render
  useEffect(() => {
    receiveThread(threadId);
  }, [threadId, receiveThread]);

  // When reconnecting changes from true to false, fetch the thread again
  useEffect(() => {
    if (previousReconnectingRef.current && !reconnecting) {
      receiveThread(threadId);
    }
    previousReconnectingRef.current = reconnecting;
  }, [reconnecting, receiveThread, threadId]);

  return {
    thread,
    isLoadingThreads,
    isLoading: isLoading ?? false,
    sendMessage,
    markMessageAsRead,
    deleteMessages,
  };
}
