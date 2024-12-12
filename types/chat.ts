export interface Thread {
  id: string;
  topic: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  threadId?: string;
}
