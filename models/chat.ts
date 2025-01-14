import { ProfileResource } from "@medplum/core";
import { Attachment, Communication, Patient, Practitioner, Reference } from "@medplum/fhirtypes";

export class ChatMessage {
  readonly originalCommunication: Communication;

  constructor({ originalCommunication }: { originalCommunication: Communication }) {
    this.originalCommunication = originalCommunication;
  }

  static fromCommunication({ comm }: { comm: Communication }): ChatMessage {
    return new ChatMessage({
      originalCommunication: comm,
    });
  }

  get id(): string {
    return this.originalCommunication.id!;
  }

  get text(): string {
    return this.originalCommunication.payload?.[0]?.contentString || "";
  }

  get attachment(): Attachment | undefined {
    // find the first attachment in the payload and return it
    for (const payload of this.originalCommunication.payload || []) {
      if (payload.contentAttachment) {
        return payload.contentAttachment;
      }
    }
    return undefined;
  }

  get senderType(): "Patient" | "Practitioner" {
    return this.originalCommunication.sender?.reference?.includes("Patient")
      ? "Patient"
      : "Practitioner";
  }

  get sentAt(): Date {
    return new Date(this.originalCommunication.sent!);
  }

  get messageOrder(): number {
    return new Date(
      this.originalCommunication.sent || this.originalCommunication.meta?.lastUpdated || new Date(),
    ).getTime();
  }

  get received(): Date | undefined {
    return this.originalCommunication.received
      ? new Date(this.originalCommunication.received)
      : undefined;
  }

  get read(): boolean {
    return this.originalCommunication.status === "completed";
  }

  get avatarRef(): Reference<Patient | Practitioner> | undefined {
    return this.originalCommunication.sender as Reference<Patient | Practitioner> | undefined;
  }
}

export class Thread {
  readonly messages: ChatMessage[];
  readonly originalCommunication: Communication;

  constructor({
    messages,
    originalCommunication,
  }: {
    messages: ChatMessage[];
    originalCommunication: Communication;
  }) {
    this.messages = [...messages].sort((a, b) => a.messageOrder - b.messageOrder);
    this.originalCommunication = originalCommunication;
  }

  static fromCommunication({
    comm,
    threadMessageComms,
  }: {
    comm: Communication;
    threadMessageComms: Communication[];
  }): Thread {
    return new Thread({
      messages: threadMessageComms.map((comm) => ChatMessage.fromCommunication({ comm })),
      originalCommunication: comm,
    });
  }

  get id(): string {
    return this.originalCommunication.id!;
  }

  get topic(): string {
    return this.originalCommunication.payload?.[0]?.contentString || this.id;
  }

  get lastMessage(): string | undefined {
    const lastMsg = this.messages[this.messages.length - 1];
    return lastMsg?.text;
  }

  get lastMessageSentAt(): Date | undefined {
    const lastMsg = this.messages[this.messages.length - 1];
    return lastMsg?.sentAt;
  }

  get threadOrder(): number {
    return new Date(
      this.lastMessageSentAt ||
        this.originalCommunication.sent ||
        this.originalCommunication.meta?.lastUpdated ||
        new Date(),
    ).getTime();
  }

  getUnreadCount({ profile }: { profile: ProfileResource }): number {
    return this.messages.filter((msg) => !msg.read && msg.senderType !== profile.resourceType)
      .length;
  }

  get lastProviderCommunication(): Communication | undefined {
    return this.messages.findLast((msg) => msg.senderType === "Practitioner")
      ?.originalCommunication;
  }

  get lastPatientCommunication(): Communication | undefined {
    return this.messages.findLast((msg) => msg.senderType === "Patient")?.originalCommunication;
  }

  get practitionerName(): string | undefined {
    return this.lastProviderCommunication?.sender?.display;
  }

  get practitionerRef(): Reference<Practitioner> | undefined {
    return this.lastProviderCommunication?.sender as Reference<Practitioner> | undefined;
  }

  get patientName(): string | undefined {
    return this.originalCommunication.subject?.display;
  }

  get patientRef(): Reference<Patient> | undefined {
    return this.originalCommunication.subject as Reference<Patient> | undefined;
  }

  getAvatarRef({
    profile,
  }: {
    profile: ProfileResource | undefined;
  }): Reference<Patient | Practitioner> | undefined {
    if (!profile) {
      return undefined;
    }
    // If the profile is a patient, we need to get the practitioner's avatar, else get the patient's avatar
    return profile.resourceType === "Patient" ? this.practitionerRef : this.patientRef;
  }
}
