export interface Thread {
  id: string;
  title: string;
  lastMessage?: string;
  lastMessageTime?: string;
  topic: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  threadId?: string;
}
