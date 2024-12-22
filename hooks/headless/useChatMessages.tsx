import { createReference } from "@medplum/core";
import { Bundle, Communication } from "@medplum/fhirtypes";
import { useMedplum } from "@medplum/react-hooks";
import { useSubscription } from "@medplum/react-hooks";
import { useCallback, useEffect, useState } from "react";

import type { ChatMessage } from "@/types/chat";
import { formatTime } from "@/utils/datetime";

export function useChatMessages(threadId: string) {
  const medplum = useMedplum();
  const profile = medplum.getProfile();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);

  // Helper function to update messages array
  const upsertMessages = useCallback(
    (newComms: Communication[]) => {
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages];
        let hasNewMessages = false;

        for (const comm of newComms) {
          const existingIdx = updatedMessages.findIndex((m) => m.id === comm.id);
          const formattedMessage = {
            id: comm.id!,
            text: comm.payload?.[0]?.contentString || "",
            senderType: (comm.sender?.reference?.includes("Patient")
              ? "Patient"
              : "Practitioner") as "Patient" | "Practitioner",
            timestamp: formatTime(comm.sent ? new Date(comm.sent) : new Date()),
            sentAt: comm.sent ? new Date(comm.sent) : new Date(),
            threadId,
          };

          if (existingIdx !== -1) {
            updatedMessages[existingIdx] = formattedMessage;
          } else {
            updatedMessages.push(formattedMessage);
            hasNewMessages = true;
          }
        }

        if (hasNewMessages) {
          return updatedMessages.sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
        }
        return updatedMessages;
      });
    },
    [threadId],
  );

  // Initial messages fetch
  const fetchMessages = useCallback(async () => {
    try {
      const communications = await medplum.search("Communication", {
        "part-of": `Communication/${threadId}`,
        _sort: "-sent",
        _count: "100",
      });

      if (communications.entry?.length) {
        const comms = communications.entry.map((e) => e.resource as Communication);
        upsertMessages(comms);
      }
    } finally {
      setLoading(false);
    }
  }, [medplum, threadId, upsertMessages]);

  // Set up real-time subscription
  useSubscription(
    `Communication?part-of=Communication/${threadId}`,
    (bundle: Bundle) => {
      const communication = bundle.entry?.[1]?.resource as Communication;
      if (communication) {
        upsertMessages([communication]);
      }
    },
    {
      onWebSocketClose: () => {
        if (!reconnecting) {
          setReconnecting(true);
        }
      },
      onWebSocketOpen: () => {
        if (reconnecting) {
          setReconnecting(false);
        }
      },
      onSubscriptionConnect: () => {
        if (reconnecting) {
          fetchMessages().catch(console.error);
          setReconnecting(false);
        }
      },
    },
  );

  // Initial fetch
  useEffect(() => {
    if (profile && threadId) {
      fetchMessages();
    }
  }, [profile, threadId, fetchMessages]);

  const sendMessage = async () => {
    if (!message.trim() || !profile) return;

    let newCommunication: Communication = {
      resourceType: "Communication",
      status: "completed",
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
    };
    newCommunication = await medplum.createResource(newCommunication);

    setMessages([
      ...messages,
      {
        id: newCommunication.id!,
        text: message,
        senderType: profile.resourceType as "Patient" | "Practitioner",
        timestamp: formatTime(new Date()),
        sentAt: new Date(),
        threadId,
      },
    ]);
    setMessage("");
  };

  return {
    message,
    setMessage,
    messages,
    loading: loading || reconnecting,
    sendMessage,
    patient: profile,
  };
}
