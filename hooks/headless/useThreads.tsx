import { createReference, getReferenceString } from "@medplum/core";
import { Bundle, Communication } from "@medplum/fhirtypes";
import { useMedplum, useSubscription } from "@medplum/react-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Thread } from "@/types/chat";
import { getQueryString } from "@/utils/url";

export function communicationToThread(comm: Communication, lastMessage?: Communication): Thread {
  return {
    id: comm.id!,
    topic: comm.payload?.[0]?.contentString || comm.id!,
    lastMessage: lastMessage?.payload?.[0]?.contentString,
    lastMessageSentAt: lastMessage?.sent ? new Date(lastMessage.sent) : undefined,
    threadOrder: new Date(
      lastMessage?.sent || comm.sent || comm.meta?.lastUpdated || new Date(),
    ).getTime(),
  };
}

export interface ThreadsProps {
  readonly onWebSocketClose?: () => void;
  readonly onWebSocketOpen?: () => void;
  readonly onSubscriptionConnect?: () => void;
  readonly onError?: (err: Error) => void;
}

export function useThreads(props: ThreadsProps = {}) {
  const { onWebSocketClose, onWebSocketOpen, onSubscriptionConnect, onError } = props;
  const medplum = useMedplum();
  const [profile, setProfile] = useState(medplum.getProfile());
  const subscriptionQuery = useMemo(
    () => ({
      "part-of:missing": true,
      subject: profile?.resourceType === "Patient" ? getReferenceString(profile) : undefined,
      _revinclude: "Communication:part-of",
    }),
    [profile],
  );
  const query = useMemo(
    () => ({
      ...subscriptionQuery,
      _sort: "-sent",
      _count: "100",
    }),
    [subscriptionQuery],
  );
  const [threads, setThreads] = useState<Thread[]>([]);
  const [reconnecting, setReconnecting] = useState(false);
  const [connectedOnce, setConnectedOnce] = useState(false);
  const [loading, setLoading] = useState(true);

  // Function to fetch threads and their last messages
  const fetchThreads = useCallback(async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const searchResults = await medplum.search("Communication", query);

      const threadComms = searchResults.entry
        ?.filter((e) => e.search?.mode === "match")
        .map((e) => e.resource!);

      const formattedThreads =
        threadComms?.map((comm) => {
          const lastMessage = searchResults.entry
            ?.filter(
              (e) =>
                e.search?.mode === "include" &&
                e.resource?.partOf?.[0]?.reference === `Communication/${comm.id}`,
            )
            .sort((e1, e2) =>
              e1.resource?.sent && e2.resource?.sent
                ? new Date(e2.resource.sent).getTime() - new Date(e1.resource.sent).getTime()
                : 1,
            )?.[0]?.resource;
          return communicationToThread(comm, lastMessage);
        }) || [];

      formattedThreads.sort((a, b) => b.threadOrder - a.threadOrder);
      setThreads(formattedThreads);
    } catch (err) {
      onError?.(err as Error);
    } finally {
      setLoading(false);
    }
  }, [medplum, profile, query, onError]);

  // Initial fetch
  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Subscribe to thread changes
  useSubscription(
    `Communication?${getQueryString(subscriptionQuery)}`,
    (bundle: Bundle) => {
      const communication = bundle.entry?.[1]?.resource as Communication;
      if (!communication) return;

      // Must re-fetch threads to get the latest thread data with _revinclude
      fetchThreads();
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
          fetchThreads();
          setReconnecting(false);
        }
        onSubscriptionConnect?.();
      }, [connectedOnce, reconnecting, fetchThreads, onSubscriptionConnect]),
      onError: useCallback((err: Error) => onError?.(err), [onError]),
    },
  );

  // Lint disabled because we can make sure this will trigger an update when local profile !== medplum.getProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const latestProfile = medplum.getProfile();
    if (profile?.id !== latestProfile?.id) {
      setProfile(latestProfile);
      setThreads([]);
    }
  });

  const createThread = useCallback(
    async (topic: string) => {
      if (!topic.trim() || !profile) return;

      if (profile.resourceType !== "Patient") {
        throw new Error("Only patients can create threads");
      }

      const newThread = await medplum.createResource({
        resourceType: "Communication",
        status: "completed",
        sent: new Date().toISOString(),
        sender: {
          reference: getReferenceString(profile),
          display: `${profile.name?.[0]?.given?.[0]} ${profile.name?.[0]?.family}`.trim(),
        },
        subject: createReference(profile),
        payload: [
          {
            contentString: topic.trim(),
          },
        ],
      } as Communication);

      setThreads((prev) => [
        {
          id: newThread.id!,
          topic: topic.trim(),
          threadOrder: new Date().getTime(),
        },
        ...prev,
      ]);

      return newThread.id;
    },
    [medplum, profile],
  );

  return { threads, loading, connectedOnce, reconnecting, createThread };
}
