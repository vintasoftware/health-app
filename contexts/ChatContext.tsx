import {
  createReference,
  getReferenceString,
  MedplumClient,
  ProfileResource,
  QueryTypes,
} from "@medplum/core";
import {
  Attachment,
  Bundle,
  Communication,
  CommunicationPayload,
  Patient,
} from "@medplum/fhirtypes";
import { useMedplumContext, useSubscription } from "@medplum/react-hooks";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createContext } from "use-context-selector";

import { Thread } from "@/models/chat";
import { syncResourceArray } from "@/utils/array";
import { getQueryString } from "@/utils/url";

async function fetchThreads({
  medplum,
  threadsQuery,
}: {
  medplum: MedplumClient;
  threadsQuery: QueryTypes;
}): Promise<{ threads: Communication[]; threadCommMap: Map<string, Communication[]> }> {
  const searchResults = await medplum.search("Communication", threadsQuery, {
    cache: "no-cache",
  });
  const threads =
    searchResults.entry?.filter((e) => e.search?.mode === "match").map((e) => e.resource!) || [];

  // Create a map of thread ID to messages
  const threadCommMap = new Map<string, Communication[]>();
  threads.forEach((thread) => {
    const messages = searchResults.entry
      ?.filter(
        (e) =>
          e.search?.mode === "include" &&
          e.resource?.partOf?.[0]?.reference === `Communication/${thread.id}`,
      )
      .map((e) => e.resource!);
    threadCommMap.set(thread.id!, messages || []);
  });

  return { threads, threadCommMap };
}

async function updateUnreceivedCommunications({
  medplum,
  communications,
}: {
  medplum: MedplumClient;
  communications: Communication[];
}): Promise<Communication[]> {
  const profile = medplum.getProfile();
  const newComms = communications.filter((comm) => !comm.received);
  if (newComms.length === 0) return communications;

  const now = new Date().toISOString();
  const updatedComms = await Promise.all(
    newComms.map((comm) => {
      const isIncoming =
        comm.sender && profile && getReferenceString(comm.sender) !== getReferenceString(profile);
      if (isIncoming) {
        return medplum.patchResource("Communication", comm.id!, [
          { op: "add", path: "/received", value: now },
        ]);
      }
      return comm;
    }),
  );
  return communications.map(
    (comm) => updatedComms.find((updated) => updated.id === comm.id) || comm,
  );
}

async function fetchThreadCommunications({
  medplum,
  threadId,
}: {
  medplum: MedplumClient;
  threadId: string;
}): Promise<Communication[]> {
  return await medplum.searchResources(
    "Communication",
    {
      "part-of": `Communication/${threadId}`,
      _sort: "-sent",
    },
    {
      cache: "no-cache",
    },
  );
}

async function createThreadComm({
  medplum,
  profile,
  topic,
}: {
  medplum: MedplumClient;
  profile: Patient;
  topic: string;
}): Promise<Communication> {
  const sent = new Date().toISOString();
  return await medplum.createResource({
    resourceType: "Communication",
    status: "completed",
    sent,
    sender: {
      reference: getReferenceString(profile),
      display: `${profile.name?.[0]?.given?.[0]} ${profile.name?.[0]?.family}`.trim(),
    },
    subject: createReference(profile),
    payload: [{ contentString: topic.trim() }],
    // Use an extension to store the last changed date.
    // This will allow to subscribe to changes to the thread, including new messages
    extension: [
      {
        url: "https://medplum.com/last-changed",
        valueDateTime: sent,
      },
    ],
  } satisfies Communication);
}

async function touchThreadLastChanged({
  medplum,
  threadId,
  value,
}: {
  medplum: MedplumClient;
  threadId: string;
  value: string;
}): Promise<void> {
  await medplum.patchResource("Communication", threadId, [
    {
      op: "add",
      path: "/extension/0/valueDateTime",
      value,
    },
  ]);
}

async function createThreadMessageComm({
  medplum,
  profile,
  message,
  threadId,
  attachment,
}: {
  medplum: MedplumClient;
  profile: ProfileResource;
  message: string;
  threadId: string;
  attachment?: Attachment;
}): Promise<Communication> {
  const payload: CommunicationPayload[] = [];

  // Add text message if provided
  if (message.trim()) {
    payload.push({ contentString: message.trim() });
  }

  // Add attachment if provided
  if (attachment) {
    payload.push({
      contentAttachment: attachment,
    });
  }

  return await medplum.createResource({
    resourceType: "Communication",
    status: "in-progress",
    sent: new Date().toISOString(),
    sender: createReference(profile),
    payload,
    partOf: [{ reference: `Communication/${threadId}` }],
  } satisfies Communication);
}

interface ChatContextType {
  threads: Thread[];
  isLoadingThreads: boolean;
  isLoadingMessagesMap: Map<string, boolean>;
  connectedOnce: boolean;
  reconnecting: boolean;
  createThread: (topic: string) => Promise<string | undefined>;
  receiveThread: (threadId: string) => Promise<void>;
  sendMessage: ({
    threadId,
    message,
    attachment,
  }: {
    threadId: string;
    message?: string;
    attachment?: ImagePicker.ImagePickerAsset;
  }) => Promise<void>;
  markMessageAsRead: ({
    threadId,
    messageId,
  }: {
    threadId: string;
    messageId: string;
  }) => Promise<void>;
}

export const ChatContext = createContext<ChatContextType>({
  threads: [],
  isLoadingThreads: true,
  isLoadingMessagesMap: new Map(),
  connectedOnce: false,
  reconnecting: false,
  createThread: async () => undefined,
  receiveThread: async () => {},
  sendMessage: async () => {},
  markMessageAsRead: async () => {},
});

interface ChatProviderProps {
  children: React.ReactNode;
  onWebSocketClose?: () => void;
  onWebSocketOpen?: () => void;
  onSubscriptionConnect?: () => void;
  onError?: (error: Error) => void;
}

export function ChatProvider({
  children,
  onWebSocketClose,
  onWebSocketOpen,
  onSubscriptionConnect,
  onError,
}: ChatProviderProps) {
  const { medplum } = useMedplumContext();
  const [profile, setProfile] = useState(medplum.getProfile());
  const [threads, setThreads] = useState<Communication[]>([]);
  const [threadCommMap, setThreadCommMap] = useState<Map<string, Communication[]>>(new Map());
  const [reconnecting, setReconnecting] = useState(false);
  const [connectedOnce, setConnectedOnce] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessagesMap, setIsLoadingMessagesMap] = useState<Map<string, boolean>>(new Map());

  // Threads memoized, sorted by threadOrder
  const threadsOut = useMemo(() => {
    if (!profile) return [];
    return threads
      .map((thread) =>
        Thread.fromCommunication({
          comm: thread,
          threadMessageComms: threadCommMap.get(thread.id!) || [],
        }),
      )
      .sort((a, b) => b.threadOrder - a.threadOrder);
  }, [profile, threads, threadCommMap]);

  // Query setup for subscription
  const subscriptionQuery = useMemo(
    () => ({
      "part-of:missing": true,
      subject: profile?.resourceType === "Patient" ? getReferenceString(profile) : undefined,
    }),
    [profile],
  );

  // Query for fetching threads (including messages)
  const threadsQuery = useMemo(
    () => ({
      ...subscriptionQuery,
      _revinclude: "Communication:part-of",
      _sort: "-sent",
    }),
    [subscriptionQuery],
  );

  // Function to fetch threads with error handling
  const refreshThreads = useCallback(async () => {
    if (!profile) return;

    try {
      setIsLoadingThreads(true);
      const { threads, threadCommMap } = await fetchThreads({ medplum, threadsQuery });
      setThreads(threads);
      setThreadCommMap(threadCommMap);
    } catch (err) {
      onError?.(err as Error);
    } finally {
      setIsLoadingThreads(false);
    }
  }, [medplum, profile, threadsQuery, onError]);

  // Fetch communications for current thread and update received timestamp
  const receiveThread = useCallback(
    async (threadId: string) => {
      try {
        setIsLoadingMessagesMap((prev) => {
          return new Map([...prev, [threadId, true]]);
        });
        let threadComms = await fetchThreadCommunications({ medplum, threadId: threadId });
        threadComms = await updateUnreceivedCommunications({
          medplum,
          communications: threadComms,
        });
        setThreadCommMap((prev) => {
          return new Map([...prev, [threadId, threadComms]]);
        });
      } catch (err) {
        onError?.(err as Error);
      } finally {
        setIsLoadingMessagesMap((prev) => {
          return new Map([...prev, [threadId, false]]);
        });
      }
    },
    [medplum, onError],
  );

  // Subscribe to communication changes
  useSubscription(
    `Communication?${getQueryString(subscriptionQuery)}`,
    useCallback(
      async (bundle: Bundle) => {
        const communication = bundle.entry?.[1]?.resource as Communication;
        if (!communication) return;

        // Sync the thread
        setThreads((prev) => syncResourceArray(prev, communication));
        // Sync the thread messages
        receiveThread(communication.id!);
      },
      [receiveThread],
    ),
    {
      onWebSocketClose: useCallback(() => {
        if (!reconnecting) {
          setReconnecting(true);
        }
        onWebSocketClose?.();
      }, [reconnecting, onWebSocketClose]),
      onWebSocketOpen: useCallback(() => {
        onWebSocketOpen?.();
      }, [onWebSocketOpen]),
      onSubscriptionConnect: useCallback(() => {
        if (!connectedOnce) {
          setConnectedOnce(true);
        }
        if (reconnecting) {
          refreshThreads();
          setReconnecting(false);
        }
        onSubscriptionConnect?.();
      }, [connectedOnce, reconnecting, onSubscriptionConnect, refreshThreads]),
      onError: useCallback((err: Error) => onError?.(err), [onError]),
    },
  );

  // Handle profile changes, clear state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const latestProfile = medplum.getProfile();
    if (profile?.id !== latestProfile?.id) {
      setProfile(latestProfile);
      setThreads([]);
      setThreadCommMap(new Map());
      setReconnecting(false);
      setConnectedOnce(false);
      setIsLoadingThreads(true);
      setIsLoadingMessagesMap(new Map());
    }
  });

  // Load initial data
  useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  // CRUD functions
  const createThread = useCallback(
    async (topic: string) => {
      if (!topic.trim() || !profile) return;
      if (profile.resourceType !== "Patient") throw new Error("Only patients can create threads");

      const newThread = await createThreadComm({ medplum, profile, topic });
      setThreads((prev) => syncResourceArray(prev, newThread));
      setThreadCommMap((prev) => {
        return new Map([...prev, [newThread.id!, []]]);
      });

      return newThread.id;
    },
    [medplum, profile],
  );

  const sendMessage = useCallback(
    async ({
      threadId,
      message,
      attachment,
    }: {
      threadId: string;
      message?: string;
      attachment?: ImagePicker.ImagePickerAsset;
    }) => {
      if (!profile) return;
      if (!message?.trim() && !attachment) return;

      try {
        let uploadedAttachment;
        if (attachment) {
          // Upload the file to Medplum
          const response = await fetch(attachment.uri);
          const blob = await response.blob();
          uploadedAttachment = await medplum.createAttachment({
            data: blob,
            filename: attachment.fileName ?? undefined,
            contentType: attachment.mimeType ?? "application/octet-stream",
          });
        }

        // Create the message
        const newCommunication = await createThreadMessageComm({
          medplum,
          profile,
          message: message ?? "",
          threadId,
          attachment: uploadedAttachment,
        });

        // Touch the thread last changed date
        await touchThreadLastChanged({
          medplum,
          threadId,
          value: newCommunication.sent!,
        });

        // Update the thread messages
        setThreadCommMap((prev) => {
          const existing = prev.get(threadId) || [];
          return new Map([...prev, [threadId, syncResourceArray(existing, newCommunication)]]);
        });
      } catch (err) {
        onError?.(err as Error);
        throw err;
      }
    },
    [profile, medplum, onError],
  );

  const markMessageAsRead = useCallback(
    async ({ threadId, messageId }: { threadId: string; messageId: string }) => {
      // Get the message
      const threadComms = threadCommMap.get(threadId) || [];
      const message = threadComms.find((c) => c.id === messageId);
      if (!message) return;

      // Check if the message is already read
      if (message.status === "completed") return;

      // Check if the message is outgoing
      const isIncoming =
        message.sender &&
        profile &&
        getReferenceString(message.sender) !== getReferenceString(profile);
      if (!isIncoming) return;

      // Mark the message as read
      const updatedCommunication = await medplum.patchResource("Communication", messageId, [
        { op: "add", path: "/status", value: "completed" },
      ]);
      setThreadCommMap((prev) => {
        const existing = prev.get(threadId) || [];
        return new Map([...prev, [threadId, syncResourceArray(existing, updatedCommunication)]]);
      });
    },
    [threadCommMap, medplum, profile],
  );

  const value = {
    threads: threadsOut,
    isLoadingThreads,
    isLoadingMessagesMap,
    connectedOnce,
    reconnecting,
    createThread,
    receiveThread,
    sendMessage,
    markMessageAsRead,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
