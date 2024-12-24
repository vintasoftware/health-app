import { Patient, Practitioner } from "@medplum/fhirtypes";

export interface Thread {
  id: string;
  topic: string;
  lastMessage?: string;
  lastMessageSentAt?: Date;
  threadOrder: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderType: Patient["resourceType"] | Practitioner["resourceType"];
  sentAt: Date;
  threadId?: string;
  messageOrder: number;
}
