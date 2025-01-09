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
  static imageURLMap = new Map<string, string>();
  static loadImageURLPromiseMap = new Map<string, Promise<void>>();

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

  get practitionerId(): string | undefined {
    return this.lastProviderCommunication?.sender?.reference;
  }

  get imageURL(): string | undefined {
    return this.practitionerId ? Thread.imageURLMap.get(this.practitionerId) : undefined;
  }

  async loadImageURL({ medplum }: { medplum: MedplumClient }) {
    // Load the image URL for the thread if it hasn't been loaded yet and it isn't already loading
    if (!this.practitionerId) return;
    if (Thread.imageURLMap.has(this.practitionerId)) return;
    if (Thread.loadImageURLPromiseMap.has(this.practitionerId)) return;

    try {
      const practitioner = await medplum.readReference(
        this.lastProviderCommunication?.sender as Reference<Practitioner>,
      );
      if (practitioner.photo?.[0]?.url) {
        const imageUrl = practitioner.photo[0].url;
        Thread.imageURLMap.set(this.practitionerId, imageUrl);
      }
    } catch {
      // Ignore errors from fetching practitioner image
    }
  }
}
