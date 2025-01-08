import { MedplumClient, ProfileResource } from "@medplum/core";
import { Communication, Practitioner, Reference } from "@medplum/fhirtypes";

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
}

export class Thread {
  readonly messages: ChatMessage[];
  readonly originalCommunication: Communication;
  static imageURLCache = new Map<string, string>();
  imageURL?: string;

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

  get practitionerName(): string | undefined {
    return this.lastProviderCommunication?.sender?.display;
  }

  async loadImageURL({ medplum }: { medplum: MedplumClient }) {
    const practitionerId = this.lastProviderCommunication?.sender?.reference;
    if (practitionerId) {
      let imageUrl = Thread.imageURLCache.get(practitionerId);

      if (!imageUrl) {
        try {
          const practitioner = await medplum.readReference(
            this.lastProviderCommunication?.sender as Reference<Practitioner>,
          );
          if (practitioner.photo?.[0]?.url) {
            imageUrl = practitioner.photo[0].url;
            Thread.imageURLCache.set(practitionerId, imageUrl);
          }
        } catch {
          // Ignore errors from fetching practitioner image
        }
      }
      if (imageUrl) {
        this.imageURL = imageUrl;
      }
    }
  }
}
