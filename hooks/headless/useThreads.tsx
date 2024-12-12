import { useMedplum } from "@medplum/react-hooks";
import { useEffect, useState } from "react";

import type { Thread } from "@/types/chat";

import { formatTimestamp } from "./useChatMessages";

export function useThreads() {
  const medplum = useMedplum();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        // Find Communications that are NOT thread headers (don't have topics).
        // Use _revinclude to get the thread messages to get the last message:
        const searchResults = await medplum.search("Communication", {
          "topic:missing": false,
          _sort: "-sent",
          _revinclude: "Communication:part-of",
        });
        const threadComms = searchResults.entry
          ?.filter((e) => e.search?.mode === "match")
          .map((e) => e.resource!);
        const lastMessage = searchResults.entry
          ?.filter((e) => e.search?.mode === "include")
          .sort((e1, e2) =>
            e1.resource?.sent && e2.resource?.sent
              ? new Date(e1.resource.sent).getTime() - new Date(e1.resource.sent).getTime()
              : 1,
          )?.[0]?.resource;

        const formattedThreads =
          threadComms?.map((comm) => {
            return {
              id: comm.id!,
              topic: comm.payload?.[0]?.contentString || comm.id!,
              lastMessage: lastMessage?.payload?.[0]?.contentString,
              lastMessageTime: lastMessage?.sent
                ? formatTimestamp(new Date(lastMessage.sent))
                : undefined,
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
