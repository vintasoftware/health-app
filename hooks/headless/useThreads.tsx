import { createReference, getReferenceString } from "@medplum/core";
import { Communication } from "@medplum/fhirtypes";
import { useMedplum } from "@medplum/react-hooks";
import { useEffect, useState } from "react";

import type { Thread } from "@/types/chat";

export function useThreads() {
  const medplum = useMedplum();
  const profile = medplum.getProfile();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchThreads = async () => {
      if (!profile) return;

      try {
        // Find Communications that are threads (have partOf missing).
        // Use _revinclude to get the thread messages to get the last message:
        const searchResults = await medplum.search("Communication", {
          "part-of:missing": true,
          // If patient, only get threads for the current patient,
          // but if practitioner, get threads for all patients:
          subject: profile.resourceType === "Patient" ? getReferenceString(profile) : undefined,
          _revinclude: "Communication:part-of",
          _sort: "-sent",
          _count: "100",
        });

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
            return {
              id: comm.id!,
              topic: comm.payload?.[0]?.contentString || comm.id!,
              lastMessage: lastMessage?.payload?.[0]?.contentString,
              lastMessageSentAt: lastMessage?.sent ? new Date(lastMessage.sent) : undefined,
              threadOrder: new Date(
                lastMessage?.sent || comm.sent || comm.meta?.lastUpdated || new Date(),
              ).getTime(),
            };
          }) || [];
        formattedThreads.sort((a, b) => b.threadOrder - a.threadOrder);

        setThreads(formattedThreads);
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
  }, [medplum, profile]);

  const createThread = async (topic: string) => {
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
      },
      ...prev,
    ]);

    return newThread.id;
  };

  return { threads, loading, createThread };
}
