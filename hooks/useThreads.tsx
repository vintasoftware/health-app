import { useContextSelector } from "use-context-selector";

import { ChatContext } from "@/contexts/ChatContext";

export function useThreads() {
  const threads = useContextSelector(ChatContext, (state) => state.threads);
  const isLoading = useContextSelector(ChatContext, (state) => state.isLoadingThreads);
  const createThread = useContextSelector(ChatContext, (state) => state.createThread);

  return {
    threads,
    isLoading,
    createThread,
  };
}
