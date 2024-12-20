import { Patient, Practitioner } from "@medplum/fhirtypes";

export interface Thread {
  id: string;
  topic: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderType: Patient["resourceType"] | Practitioner["resourceType"];
  timestamp: string;
  threadId?: string;
}
