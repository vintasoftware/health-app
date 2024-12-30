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
  profile,
}: {
  medplum: MedplumClient;
  threadsQuery: QueryTypes;
  profile: ProfileResource;
}): Promise<Thread[]> {
  const searchResults = await medplum.search("Communication", threadsQuery);
  const threadComms = searchResults.entry
    ?.filter((e) => e.search?.mode === "match")
    .map((e) => e.resource!);

  // Create a map of thread ID to messages
  const threadMessagesMap = new Map<string, Communication[]>();
  threadComms?.forEach((thread) => {
    const messages = searchResults.entry
      ?.filter(
        (e) =>
          e.search?.mode === "include" &&
          e.resource?.partOf?.[0]?.reference === `Communication/${thread.id}`,
      )
      .map((e) => e.resource!);
    threadMessagesMap.set(thread.id!, messages || []);
  });

  // Format Communications to type Thread
  const threads =
    threadComms?.map((comm) =>
      communicationToThread(profile, comm, threadMessagesMap.get(comm.id!) || []),
    ) || [];
  threads.sort((a, b) => b.threadOrder - a.threadOrder);

  return threads;
}

function getMessageOrder(comm: Communication): number {
  const sent = comm.sent || comm.meta?.lastUpdated || new Date();
  return new Date(sent).getTime();
}

function communicationToMessage(communication: Communication): ChatMessage {
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

async function updateUnreceivedMessages({
  medplum,
  messages,
}: {
  medplum: MedplumClient;
  messages: ChatMessage[];
}): Promise<ChatMessage[]> {
  const newMessages = messages.filter((comm) => !comm.received);
  if (newMessages.length === 0) return messages;

  const now = new Date().toISOString();
  const updatedMessages = (
    await Promise.all(
      newMessages.map((comm) =>
        medplum.patchResource("Communication", comm.id!, [
          { op: "add", path: "/received", value: now },
        ]),
      ),
    )
  ).map(communicationToMessage);

  return messages.map((msg) => updatedMessages.find((updated) => updated.id === msg.id) || msg);
}

async function fetchThreadCommunications({
  medplum,
  threadId,
}: {
  medplum: MedplumClient;
  threadId: string;
}): Promise<Communication[]> {
  return await medplum.searchResources("Communication", {
    "part-of": `Communication/${threadId}`,
    _sort: "-sent",
  });
}

async function createThreadCommunication({
  medplum,
  profile,
  topic,
}: {
  medplum: MedplumClient;
  profile: ProfileResource;
  topic: string;
}): Promise<Communication> {
  return await medplum.createResource({
    resourceType: "Communication",
    status: "completed",
    sent: new Date().toISOString(),
    sender: {
      reference: getReferenceString(profile),
      display: `${profile.name?.[0]?.given?.[0]} ${profile.name?.[0]?.family}`.trim(),
    },
    subject: createReference(profile),
    payload: [{ contentString: topic.trim() }],
  } as Communication);
}

async function createThreadMessage({
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
  } as Communication);
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

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const medplum = useMedplum();
  const [profile, setProfile] = useState(medplum.getProfile());
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadMessages, setThreadMessages] = useState<ChatMessage[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [reconnecting, setReconnecting] = useState(false);
  const [connectedOnce, setConnectedOnce] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Profile reference string
  const profileRefStr = useMemo<string>(
    () => (profile ? getReferenceString(medplum.getProfile() as ProfileResource) : ""),
    [profile, medplum],
  );

  // Query setup for subscription
  const subscriptionQuery = useMemo(
    () => ({
      "part-of:missing": true,
      subject: profile?.resourceType === "Patient" ? getReferenceString(profile) : undefined,
      _revinclude: "Communication:part-of",
    }),
    [profile],
  );

  // Query for fetching threads
  const threadsQuery = useMemo(
    () => ({
      ...subscriptionQuery,
      _sort: "-sent",
    }),
    [subscriptionQuery],
  );

  // Function to fetch threads
  const refreshThreads = useCallback(async () => {
    if (!profile) return;

    try {
      setIsLoadingThreads(true);
      const threads = await fetchThreads({ medplum, threadsQuery, profile });
      setThreads(threads);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingThreads(false);
    }
  }, [medplum, profile, threadsQuery]);

  // Fetch communications for current thread and update received timestamp
  const receiveThreadCommunications = useCallback(async () => {
    if (!currentThreadId) return;

    try {
      setIsLoadingMessages(true);
      const threadComms = await fetchThreadCommunications({ medplum, threadId: currentThreadId });
      let updatedMessages = threadComms.map(communicationToMessage);
      updatedMessages = await updateUnreceivedMessages({ medplum, messages: updatedMessages });
      setThreadMessages(updatedMessages);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [currentThreadId, medplum]);

  // Subscribe to all communication changes
  useSubscription(
    `Communication?${getQueryString(subscriptionQuery)}`,
    async (bundle: Bundle) => {
      const communication = bundle.entry?.[1]?.resource as Communication;
      if (!communication) return;

      // If this is a thread message (no partOf), refresh threads
      if (!communication.partOf?.length) {
        refreshThreads();
        return;
      }

      // If this is a message for current thread, update messages
      if (
        currentThreadId &&
        communication.partOf?.[0]?.reference === `Communication/${currentThreadId}`
      ) {
        // Update received timestamp when the sender is not the current user
        if (
          !communication.received &&
          getReferenceString(communication.sender as Reference) !== profileRefStr
        ) {
          const newMessage = (
            await updateUnreceivedMessages({
              medplum,
              messages: [communicationToMessage(communication)],
            })
          )[0];

          // Add or update the message in threadMessages
          setThreadMessages((prev) => {
            const existing = prev.findIndex((c) => c.id === newMessage.id);
            if (existing !== -1) {
              return [...prev.slice(0, existing), newMessage, ...prev.slice(existing + 1)];
            }
            return [...prev, newMessage];
          });
        }
      }
    },
    {
      onWebSocketClose: useCallback(() => {
        if (!reconnecting) {
          setReconnecting(true);
        }
      }, [reconnecting]),
      onSubscriptionConnect: useCallback(() => {
        if (!connectedOnce) {
          setConnectedOnce(true);
        }
        if (reconnecting) {
          receiveThreadCommunications();
          setReconnecting(false);
        }
      }, [connectedOnce, reconnecting, receiveThreadCommunications]),
    },
  );

  // Handle profile changes
  // Lint disabled because we can make sure this will trigger an update when local profile !== medplum.getProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const latestProfile = medplum.getProfile();
    if (profile?.id !== latestProfile?.id) {
      setProfile(latestProfile);
      setThreads([]);
      setThreadMessages([]);
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
      setThreadMessages([]);
      setCurrentThreadId(threadId);
      receiveThreadCommunications();
    },
    [receiveThreadCommunications],
  );

  // CRUD functions
  const createThread = useCallback(
    async (topic: string) => {
      if (!topic.trim() || !profile) return;
      if (profile.resourceType !== "Patient") throw new Error("Only patients can create threads");

      const newThread = await createThreadCommunication({ medplum, profile, topic });
      setThreads((prev) => [communicationToThread(profile, newThread, []), ...prev]);
      return newThread.id;
    },
    [medplum, profile],
  );

  const sendMessage = useCallback(async () => {
    if (!message.trim() || !profile || !currentThreadId) return;

    const newCommunication = await createThreadMessage({
      medplum,
      profile,
      message,
      threadId: currentThreadId,
    });
    setThreadMessages((prev) => [...prev, communicationToMessage(newCommunication)]);
    setMessage("");
  }, [message, profile, currentThreadId, medplum]);

  const markMessageAsRead = useCallback(
    async (messageId: string) => {
      const message = threadMessages.find((c) => c.id === messageId);
      if (!message || message.read) return;

      const updatedCommunication = await medplum.patchResource("Communication", messageId, [
        { op: "add", path: "/status", value: "completed" },
      ]);
      setThreadMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? communicationToMessage(updatedCommunication) : msg,
        ),
      );
    },
    [threadMessages, medplum],
  );

  const value = {
    threads,
    isLoadingThreads,
    isLoadingMessages,
    connectedOnce,
    reconnecting,
    createThread,
    currentThreadId,
    selectThread,
    threadMessages,
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
