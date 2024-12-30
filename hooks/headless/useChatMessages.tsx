import { createReference, getReferenceString, ProfileResource } from "@medplum/core";
import { Bundle, Communication, Reference } from "@medplum/fhirtypes";
import { useMedplum, useSubscription } from "@medplum/react-hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChatMessage } from "@/types/chat";

function getMessageOrder(comm: Communication): number {
  const sent = comm.sent || comm.meta?.lastUpdated || new Date();
  return new Date(sent).getTime();
}

function setAndSortCommunications(
  communications: Communication[],
  received: Communication[],
  setCommunications: (communications: Communication[]) => void,
): void {
  const newCommunications = [...communications];
  let foundNew = false;
  for (const comm of received) {
    const existingIdx = newCommunications.findIndex((c) => c.id === comm.id);
    if (existingIdx !== -1) {
      newCommunications[existingIdx] = comm;
    } else {
      newCommunications.push(comm);
      foundNew = true;
    }
  }

  if (foundNew) {
    newCommunications.sort((a, b) => getMessageOrder(a) - getMessageOrder(b));
  }

  setCommunications(newCommunications);
}

export interface BaseChatProps {
  readonly communications: Communication[];
  readonly setCommunications: (communications: Communication[]) => void;
  readonly query: string;
  readonly onMessageReceived?: (message: Communication) => void;
  readonly onMessageUpdated?: (message: Communication) => void;
  readonly onWebSocketClose?: () => void;
  readonly onWebSocketOpen?: () => void;
  readonly onSubscriptionConnect?: () => void;
  readonly onError?: (err: Error) => void;
}

export function useBaseChatCommunications(props: BaseChatProps) {
  const {
    communications,
    setCommunications,
    query,
    onMessageReceived,
    onMessageUpdated,
    onWebSocketClose,
    onWebSocketOpen,
    onSubscriptionConnect,
    onError,
  } = props;
  const medplum = useMedplum();
  const [profile, setProfile] = useState(medplum.getProfile());
  const [reconnecting, setReconnecting] = useState(false);
  const [connectedOnce, setConnectedOnce] = useState(false);
  const [loading, setLoading] = useState(true);

  const profileRefStr = useMemo<string>(
    () => (profile ? getReferenceString(medplum.getProfile() as ProfileResource) : ""),
    [profile, medplum],
  );

  const updateUnreceivedMessages = useCallback(
    async (comms: Communication[]): Promise<Communication[]> => {
      const newComms = comms.filter((comm) => !comm.received);
      if (newComms.length === 0) return comms;

      const now = new Date().toISOString();
      const updatedComms = await Promise.all(
        newComms.map((comm) =>
          medplum.patchResource("Communication", comm.id!, [
            { op: "add", path: "/received", value: now },
          ]),
        ),
      );

      // Replace the original comms with updated ones
      return comms.map((msg) => updatedComms.find((updated) => updated.id === msg.id) || msg);
    },
    [medplum],
  );

  const fetchMessages = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      // Fetch messages
      const searchParams = new URLSearchParams(query);
      searchParams.append("_sort", "-sent");
      let searchResult = (await medplum.searchResources("Communication", searchParams, {
        cache: "no-cache",
      })) as Communication[];
      // Update all messages without received timestamp
      searchResult = await updateUnreceivedMessages(searchResult);
      setAndSortCommunications(communicationsRef.current, searchResult, setCommunications);
    } catch (err) {
      onError?.(err as Error);
    } finally {
      setLoading(false);
    }
  }, [query, medplum, updateUnreceivedMessages, setCommunications, onError]);

  // Load messages on mount
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to new messages
  useSubscription(
    `Communication?${query}`,
    async (bundle: Bundle) => {
      let communication = bundle.entry?.[1]?.resource as Communication;
      // If we are the sender of this message, then we want to skip calling `onMessageUpdated` or `onMessageReceived`
      if (getReferenceString(communication.sender as Reference) !== profileRefStr) {
        // If this communication already exists, call `onMessageUpdated`
        if (communicationsRef.current.find((c) => c.id === communication.id)) {
          onMessageUpdated?.(communication);
        } else {
          // Else a new message was created
          // Update the communication with received timestamp
          if (!communication.received) {
            communication = await medplum.patchResource("Communication", communication.id!, [
              { op: "add", path: "/received", value: new Date().toISOString() },
            ]);
          }
          // Call `onMessageReceived` when we are not the sender of a chat message that came in
          onMessageReceived?.(communication);
        }
        setAndSortCommunications(communicationsRef.current, [communication], setCommunications);
      }
    },
    {
      onWebSocketOpen: onWebSocketOpen,
      onWebSocketClose: useCallback(() => {
        if (!reconnecting) {
          setReconnecting(true);
        }
        onWebSocketClose?.();
      }, [reconnecting, onWebSocketClose]),
      onSubscriptionConnect: useCallback(() => {
        if (!connectedOnce) {
          setConnectedOnce(true);
        }
        if (reconnecting) {
          fetchMessages();
          setReconnecting(false);
        }
        onSubscriptionConnect?.();
      }, [connectedOnce, reconnecting, fetchMessages, onSubscriptionConnect]),
      onError: useCallback((err: Error) => onError?.(err), [onError]),
    },
  );

  // Lint disabled because we can make sure this will trigger an update when local profile !== medplum.getProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const latestProfile = medplum.getProfile();
    if (profile?.id !== latestProfile?.id) {
      setProfile(latestProfile);
      setCommunications([]);
    }
  });

  const communicationsRef = useRef<Communication[]>(communications);
  communicationsRef.current = communications;

  return {
    loading,
    connectedOnce,
    reconnecting,
  };
}

export interface ChatMessagesProps {
  readonly threadId: string;
  readonly onMessageReceived?: (message: Communication) => void;
  readonly onMessageUpdated?: (message: Communication) => void;
  readonly onWebSocketClose?: () => void;
  readonly onWebSocketOpen?: () => void;
  readonly onSubscriptionConnect?: () => void;
  readonly onError?: (err: Error) => void;
}

export function communicationToMessage(communication: Communication): ChatMessage {
  return {
    id: communication.id!,
    text: communication.payload?.[0]?.contentString || "",
    senderType: (communication.sender?.reference?.includes("Patient")
      ? "Patient"
      : "Practitioner") as "Patient" | "Practitioner",
    sentAt: new Date(communication.sent as string),
    messageOrder: getMessageOrder(communication),
    received: communication.received ? new Date(communication.received) : undefined,
    read: communication.status === "completed",
  };
}

export function useChatMessages(props: ChatMessagesProps) {
  const {
    threadId,
    onMessageReceived,
    onMessageUpdated,
    onWebSocketClose,
    onWebSocketOpen,
    onSubscriptionConnect,
    onError,
  } = props;
  const medplum = useMedplum();
  const profile = medplum.getProfile();
  const query = `part-of=Communication/${threadId}`;
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [message, setMessage] = useState<string>("");
  const { loading, connectedOnce, reconnecting } = useBaseChatCommunications({
    communications,
    setCommunications,
    query,
    onMessageReceived,
    onMessageUpdated,
    onWebSocketClose,
    onWebSocketOpen,
    onSubscriptionConnect,
    onError,
  });
  const messages = useMemo(() => communications.map(communicationToMessage), [communications]);

  const sendMessage = useCallback(async () => {
    if (!message.trim() || !profile) return;

    const newCommunication = await medplum.createResource({
      resourceType: "Communication",
      status: "in-progress",
      sent: new Date().toISOString(),
      sender: createReference(profile),
      payload: [
        {
          contentString: message.trim(),
        },
      ],
      partOf: [
        {
          reference: `Communication/${threadId}`,
        },
      ],
    } as Communication);

    setCommunications([...communications, newCommunication]);
    setMessage("");
  }, [message, profile, medplum, threadId, communications, setCommunications]);

  const markMessageAsRead = useCallback(
    async (messageId: string) => {
      const message = communications.find((c) => c.id === messageId);
      if (!message || message.status === "completed") return;

      const updatedMessage = await medplum.patchResource("Communication", messageId, [
        { op: "add", path: "/status", value: "completed" },
      ]);
      setAndSortCommunications(communications, [updatedMessage], setCommunications);
    },
    [communications, medplum, setCommunications],
  );

  return {
    message,
    setMessage,
    messages,
    loading,
    connectedOnce,
    reconnecting,
    sendMessage,
    markMessageAsRead,
  };
}
