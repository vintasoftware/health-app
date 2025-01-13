import { useContextSelector } from "use-context-selector";

import { ChatContext } from "@/contexts/ChatContext";

export function useChatConnectionState() {
  const connectedOnce = useContextSelector(ChatContext, (state) => state.connectedOnce);
  const reconnecting = useContextSelector(ChatContext, (state) => state.reconnecting);

  return {
    connectedOnce,
    reconnecting,
  };
}
