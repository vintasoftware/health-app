import { Attachment } from "@medplum/fhirtypes";

export type AttachmentWithUrl = Attachment & { url: string };
