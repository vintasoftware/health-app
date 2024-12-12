import { useState, useEffect } from "react";
import { useMedplum } from "@medplum/react-hooks";
import { Communication } from "@medplum/fhirtypes";
import { formatTimestamp } from "./useChatMessages";
import type { Thread } from "@/types/chat";

export function useThreads() {
  const medplum = useMedplum();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        // Find Communications that are NOT thread headers (don't have topics)
        const threadHeaders = await medplum.search("Communication", {
          "topic:missing": false,
          _sort: "-sent",
        });

        const formattedThreads =
          threadHeaders.entry?.map((entry) => {
            const comm = entry.resource as Communication;
            return {
              id: comm.id!,
              topic: comm.topic?.text || "",
              lastMessage: comm.payload?.[0]?.contentString,
              lastMessageTime: comm.sent ? formatTimestamp(new Date(comm.sent)) : undefined,
            };
          }) || [];

        setThreads(formattedThreads);
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
  }, [medplum]);

  return { threads, loading };
}
