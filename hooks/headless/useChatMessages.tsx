import { Communication } from "@medplum/fhirtypes";
import { useMedplum } from "@medplum/react-hooks";
import { useEffect, useState } from "react";

import type { ChatMessage } from "@/types/chat";
import { formatTimestamp } from "@/utils/datetime";

export function useChatMessages(threadId: string) {
  const medplum = useMedplum();
  const profile = medplum.getProfile();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        // Find Communications that are part of this thread
        const communications = await medplum.search("Communication", {
          "part-of": `Communication/${threadId}`,
          _sort: "-sent",
          _count: "100",
        });

        const formattedMessages =
          communications.entry?.map((entry) => {
            const comm = entry.resource as Communication;
            return {
              id: comm.id!,
              text: comm.payload?.[0]?.contentString || "",
              sender: (comm.sender?.reference?.includes("Patient") ? "Patient" : "Practitioner") as
                | "Patient"
                | "Practitioner",
              timestamp: formatTimestamp(comm.sent ? new Date(comm.sent) : new Date()),
              threadId,
            };
          }) || [];

        setMessages(formattedMessages.reverse());
      } finally {
        setLoading(false);
      }
    };

    if (profile && threadId) {
      fetchMessages();
    }
  }, [medplum, profile, threadId]);

  const sendMessage = async () => {
    if (!message.trim() || !profile) return;

    let newCommunication: Communication = {
      resourceType: "Communication",
      status: "completed",
      sent: new Date().toISOString(),
      sender: {
        reference: `Patient/${profile.id}`,
        display:
          `${profile.name?.[0]?.given?.[0]} ${profile.name?.[0]?.family}`.trim() || "Patient",
      },
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
    };
    newCommunication = await medplum.createResource(newCommunication);

    setMessages([
      ...messages,
      {
        id: newCommunication.id!,
        text: message,
        sender: profile.resourceType as "Patient" | "Practitioner",
        timestamp: formatTimestamp(new Date()),
        threadId,
      },
    ]);
    setMessage("");
  };

  return {
    message,
    setMessage,
    messages,
    loading,
    sendMessage,
    patient: profile,
  };
}
