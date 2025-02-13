/**
 * Bot to send Expo push notifications for new chat messages.
 *
 * This bot listens for new Communication resources (messages) and sends push notifications
 * to the appropriate recipients based on the sender type:
 * - When a Patient sends a message: notifies all Practitioners
 * - When a Practitioner sends a message: notifies only the Patient
 *
 * Requirements:
 * 1. Users (Patients and Practitioners) must have an Expo push token stored in their
 *    profile using the extension: https://medplum.com/push-token
 * 2. A Medplum subscription must be set up with the following configuration:
 *    ```
 *    Criteria: Communication?part-of:missing=false
 *    Status: active
 *    Channel Type: rest-hook
 *    Channel Endpoint: Bot/<YOUR_BOT_ID>
 *    Channel Payload: application/fhir+json
 *    ```
 *
 * Features:
 * - Sends notifications in batches of 100 (Expo API limit)
 * - Implements exponential backoff retry (3 attempts) for failed requests
 * - Handles attachments with a 📎 indicator in the notification
 * - Includes threadId in notification data for deep linking
 * - Supports both Patient and Practitioner message notifications
 *
 * Note: This bot only processes new messages (status !== "completed" && !received)
 * and ignores thread Communications (no partOf reference).
 */
import { BotEvent, MedplumClient } from "@medplum/core";
import { Communication, Patient, Practitioner } from "@medplum/fhirtypes";

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

interface ExpoNotificationMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sound?: "default";
  badge?: number;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

interface ExpoPushResponse {
  data: ExpoPushTicket[];
  errors?: {
    code: string;
    message: string;
  }[];
}

/**
 * Sleep for a given number of milliseconds
 * @param ms - Number of milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determines if an error is retryable based on its status code
 * @param statusCode - HTTP status code
 * @returns Whether the error is retryable
 */
function isRetryableError(statusCode: number): boolean {
  // Retry on rate limiting (429) and server errors (5xx)
  return statusCode === 429 || (statusCode >= 500 && statusCode < 600);
}

/**
 * Gets the display name for a sender
 * @param sender - The sender resource (Patient or Practitioner)
 * @returns The display name
 */
function getSenderDisplayName(sender: Patient | Practitioner): string {
  const title = sender.resourceType === "Patient" ? "Patient" : "Dr.";
  const name = sender.name?.[0];
  if (!name) {
    return title;
  }
  return `${title} ${name.family || name.given?.[0] || ""}`.trim();
}

/**
 * Sends notifications in batches to Expo Push API with exponential backoff retry
 * @param notifications - Array of notifications to send
 */
async function sendNotificationBatch(notifications: ExpoNotificationMessage[]): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // If this isn't our first attempt, wait with exponential backoff
      if (attempt > 0) {
        const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        console.log(`Retry attempt ${attempt + 1}/${MAX_RETRIES}, waiting ${delayMs}ms...`);
        await sleep(delayMs);
      }

      const response = await fetch(EXPO_PUSH_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notifications),
      });

      // If response is not ok, check if we should retry
      if (!response.ok) {
        if (isRetryableError(response.status)) {
          const error = await response.text();
          lastError = new Error(`Failed to send push notifications (${response.status}): ${error}`);
          continue; // Try again with backoff
        }
        // If it's not a retryable error (e.g., 400 Bad Request), throw immediately
        const error = await response.text();
        throw new Error(`Failed to send push notifications (${response.status}): ${error}`);
      }

      // Get the response data to check for any errors with individual notifications
      const data = (await response.json()) as ExpoPushResponse;
      const errors = data.errors || [];
      if (errors.length > 0) {
        console.error("Expo push notification errors:", errors);
      }

      // Log any individual notification errors
      const failedTickets = data.data.filter((ticket) => ticket.status === "error");
      if (failedTickets.length > 0) {
        console.error("Failed notification tickets:", failedTickets);
      }

      // If we got here, the request was successful
      return;
    } catch (error) {
      lastError = error as Error;
      // On last attempt, don't continue
      if (attempt === MAX_RETRIES - 1) {
        break;
      }
    }
  }

  // If we got here, all retries failed
  throw new Error(
    `Failed to send push notifications after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`,
  );
}

/**
 * Handles a Communication resource change event.
 * Sends push notifications to relevant recipients based on the message content.
 * @param medplum - The Medplum client.
 * @param event - The bot event.
 */
export async function handler(medplum: MedplumClient, event: BotEvent): Promise<void> {
  // Get the Communication resource from the event
  const communication = event.input as Communication;

  // Skip if this is a thread (no partOf reference)
  if (!communication.partOf?.[0]) {
    return;
  }

  // Skip if this is not a new message
  if (communication.received || communication.status === "completed") {
    return;
  }

  // Skip if there's no sender
  if (!communication.sender) {
    return;
  }

  // Get the thread
  const thread = await medplum.readReference(communication.partOf[0]);
  if (!thread || thread.resourceType !== "Communication") {
    return;
  }

  // Skip if there's no patient (subject of the thread)
  if (!thread.subject) {
    return;
  }

  // Get the patient (subject of the thread)
  const patient = await medplum.readReference(thread.subject);
  if (!patient || patient.resourceType !== "Patient") {
    return;
  }

  // Get the sender
  const sender = await medplum.readReference(communication.sender);
  if (!sender || (sender.resourceType !== "Patient" && sender.resourceType !== "Practitioner")) {
    return;
  }

  // Determine recipients based on sender type
  let recipients: (Patient | Practitioner)[] = [];
  if (sender.resourceType === "Patient") {
    // If sender is patient, notify practitioners
    const practitioners = await medplum.searchResources("Practitioner", {});
    recipients = practitioners;
  } else if (sender.resourceType === "Practitioner") {
    // If sender is practitioner, notify the patient
    recipients = [patient];
  }

  // Get message content
  const hasAttachment = communication.payload?.some((p) => p.contentAttachment);

  // Create notifications for all recipients
  const notifications: ExpoNotificationMessage[] = [];
  for (const recipient of recipients) {
    const pushToken = recipient.extension?.find(
      (e) => e.url === "https://medplum.com/push-token",
    )?.valueString;

    if (pushToken) {
      notifications.push({
        to: pushToken,
        title: `New message from ${getSenderDisplayName(sender)}`,
        body: hasAttachment ? "📎 Click to view attachment" : "Click to view message",
        data: {
          threadId: thread.id,
        },
        sound: "default",
        badge: 1,
      });
    }
  }

  // Send notifications in batches of 100
  for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
    const batch = notifications.slice(i, i + BATCH_SIZE);
    try {
      await sendNotificationBatch(batch);
    } catch (error) {
      console.error(`Error sending batch ${i / BATCH_SIZE + 1}:`, error);
      // Continue with next batch even if this one failed
    }
  }
}
