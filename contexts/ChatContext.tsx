import {
  createReference,
  getReferenceString,
  MedplumClient,
  ProfileResource,
  QueryTypes,
} from "@medplum/core";
import {
  Bundle,
  Communication,
  Patient,
  Practitioner,
  Reference,
  RelatedPerson,
} from "@medplum/fhirtypes";
import { useMedplum, useSubscription } from "@medplum/react-hooks";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { ChatMessage, Thread } from "@/types/chat";
import { syncResourceArray } from "@/utils/array";
import { getQueryString } from "@/utils/url";

function communicationToThread(
  profile: Patient | Practitioner | RelatedPerson,
  comm: Communication,
  threadMessageComms: Communication[],
): Thread {
  const lastMessage = threadMessageComms
    .sort((a, b) => {
      if (!a.sent) return 1;
      if (!b.sent) return -1;
      return new Date(a.sent).getTime() - new Date(b.sent).getTime();
    })
    .reverse()?.[0];
  const unreadCount = threadMessageComms.filter(
    (msg) => msg.status !== "completed" && msg.sender?.reference !== getReferenceString(profile),
  ).length;

  return {
    id: comm.id!,
    topic: comm.payload?.[0]?.contentString || comm.id!,
    lastMessage: lastMessage?.payload?.[0]?.contentString,
    lastMessageSentAt: lastMessage?.sent ? new Date(lastMessage.sent) : undefined,
    threadOrder: new Date(
      lastMessage?.sent || comm.sent || comm.meta?.lastUpdated || new Date(),
    ).getTime(),
    unreadCount,
  };
}

async function fetchThreads({
  medplum,
  threadsQuery,
}: {
  medplum: MedplumClient;
  threadsQuery: QueryTypes;
}): Promise<{ threads: Communication[]; threadCommMap: Map<string, Communication[]> }> {
  const searchResults = await medplum.search("Communication", threadsQuery);
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

function getMessageOrder(comm: Communication): number {
  const sent = comm.sent || comm.meta?.lastUpdated || new Date();
  return new Date(sent).getTime();
}

function communicationToMessage(communication: Communication): ChatMessage {
  return {
    id: communication.id!,
    text: communication.payload?.[0]?.contentString || "",
    senderType: communication.sender?.reference?.includes("Patient") ? "Patient" : "Practitioner",
    sentAt: new Date(communication.sent!),
    messageOrder: getMessageOrder(communication),
    received: communication.received ? new Date(communication.received) : undefined,
    read: communication.status === "completed",
  };
}

async function updateUnreceivedCommunications({
  medplum,
  communications,
  profileRefStr,
}: {
  medplum: MedplumClient;
  communications: Communication[];
  profileRefStr: string;
}): Promise<Communication[]> {
  const newComms = communications.filter((comm) => !comm.received);
  if (newComms.length === 0) return communications;

  const now = new Date().toISOString();
  const updatedComms = await Promise.all(
    newComms.map((comm) => {
      const isIncoming = getReferenceString(comm.sender as Reference) !== profileRefStr;
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
}: {
  medplum: MedplumClient;
  profile: ProfileResource;
  message: string;
  threadId: string;
}): Promise<Communication> {
  return await medplum.createResource({
    resourceType: "Communication",
    status: "in-progress",
    sent: new Date().toISOString(),
    sender: createReference(profile),
    payload: [{ contentString: message.trim() }],
    partOf: [{ reference: `Communication/${threadId}` }],
  } satisfies Communication);
}

interface ChatContextType {
  // Thread state
  threads: Thread[];
  isLoadingThreads: boolean;
  isLoadingMessages: boolean;
  connectedOnce: boolean;
  reconnecting: boolean;
  createThread: (topic: string) => Promise<string | undefined>;

  // Current thread & messages
  currentThreadId: string | null;
  selectThread: (threadId: string) => void;
  threadMessages: ChatMessage[];
  message: string;
  setMessage: (message: string) => void;
  sendMessage: () => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

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
  const medplum = useMedplum();
  const [profile, setProfile] = useState(medplum.getProfile());
  const [threads, setThreads] = useState<Communication[]>([]);
  const [threadCommMap, setThreadCommMap] = useState<Map<string, Communication[]>>(new Map());
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [reconnecting, setReconnecting] = useState(false);
  const [connectedOnce, setConnectedOnce] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Threads
  const threadsOut = useMemo(() => {
    if (!profile) return [];
    return threads
      .map((thread) => communicationToThread(profile, thread, threadCommMap.get(thread.id!) || []))
      .sort((a, b) => b.threadOrder - a.threadOrder);
  }, [threads, profile, threadCommMap]);

  // Thread messages
  const threadMessagesOut = useMemo(() => {
    if (!currentThreadId) return [];
    return (
      threadCommMap
        .get(currentThreadId)
        ?.map(communicationToMessage)
        .sort((a, b) => a.messageOrder - b.messageOrder) || []
    );
  }, [currentThreadId, threadCommMap]);

  // Profile reference string
  const profileRefStr = useMemo(() => (profile ? getReferenceString(profile) : ""), [profile]);

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
  const receiveThreadCommunications = useCallback(
    async (threadId: string) => {
      try {
        setIsLoadingMessages(true);
        let threadComms = await fetchThreadCommunications({ medplum, threadId: threadId });
        threadComms = await updateUnreceivedCommunications({
          medplum,
          communications: threadComms,
          profileRefStr,
        });
        setThreadCommMap((prev) => {
          return new Map([...prev, [threadId, threadComms]]);
        });
      } catch (err) {
        onError?.(err as Error);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [medplum, profileRefStr, onError],
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
        receiveThreadCommunications(communication.id!);
      },
      [receiveThreadCommunications],
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
          const refreshPromise = refreshThreads();
          if (currentThreadId) {
            refreshPromise.then(() => receiveThreadCommunications(currentThreadId));
          }
          setReconnecting(false);
        }
        onSubscriptionConnect?.();
      }, [
        connectedOnce,
        reconnecting,
        onSubscriptionConnect,
        refreshThreads,
        currentThreadId,
        receiveThreadCommunications,
      ]),
      onError: useCallback((err: Error) => onError?.(err), [onError]),
    },
  );

  // Handle profile changes
  // Lint disabled because we can make sure this will trigger an update when local profile !== medplum.getProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const latestProfile = medplum.getProfile();
    if (profile?.id !== latestProfile?.id) {
      setProfile(latestProfile);
      setThreadCommMap(new Map());
      setCurrentThreadId(null);
    }
  });

  // Load initial data
  useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  // Thread selection function
  const selectThread = useCallback(
    (threadId: string) => {
      setCurrentThreadId(threadId);
      receiveThreadCommunications(threadId);
    },
    [receiveThreadCommunications],
  );

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

  const sendMessage = useCallback(async () => {
    if (!message.trim() || !profile || !currentThreadId) return;

    // Create the message
    const newCommunication = await createThreadMessageComm({
      medplum,
      profile,
      message,
      threadId: currentThreadId,
    });

    // Touch the thread last changed date
    // to ensure useSubscription will trigger for message receivers
    await touchThreadLastChanged({
      medplum,
      threadId: currentThreadId,
      value: newCommunication.sent!,
    });

    // Update the thread messages
    setThreadCommMap((prev) => {
      const existing = prev.get(currentThreadId) || [];
      return new Map([...prev, [currentThreadId, syncResourceArray(existing, newCommunication)]]);
    });
    setMessage("");
  }, [message, profile, currentThreadId, medplum]);

  const markMessageAsRead = useCallback(
    async (messageId: string) => {
      // Check if the current thread is loaded
      if (!currentThreadId) return;

      // Get the message
      const threadComms = threadCommMap.get(currentThreadId) || [];
      const message = threadComms.find((c) => c.id === messageId);
      if (!message) return;

      // Check if the message is already read
      if (message.status === "completed") return;

      // Check if the message is outgoing
      const isOutgoing = getReferenceString(message.sender as Reference) === profileRefStr;
      if (isOutgoing) return;

      // Mark the message as read
      const updatedCommunication = await medplum.patchResource("Communication", messageId, [
        { op: "add", path: "/status", value: "completed" },
      ]);
      setThreadCommMap((prev) => {
        const existing = prev.get(currentThreadId) || [];
        return new Map([
          ...prev,
          [currentThreadId, syncResourceArray(existing, updatedCommunication)],
        ]);
      });
    },
    [currentThreadId, threadCommMap, medplum, profileRefStr],
  );

  const value = {
    threads: threadsOut,
    isLoadingThreads,
    isLoadingMessages,
    connectedOnce,
    reconnecting,
    createThread,
    currentThreadId,
    selectThread,
    threadMessages: threadMessagesOut,
    message,
    setMessage,
    sendMessage,
    markMessageAsRead,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
