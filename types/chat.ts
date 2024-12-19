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
  sender: Patient["resourceType"] | Practitioner["resourceType"];
  timestamp: string;
  threadId?: string;
}
