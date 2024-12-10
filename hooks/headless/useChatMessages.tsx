import { useState, useEffect } from "react";
import { useMedplum } from "@medplum/react-hooks";
import { Communication, Patient } from "@medplum/fhirtypes";
import type { ChatMessage } from "@/types/chat";

export function formatTimestamp(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function useChatMessages(threadId: string) {
  const medplum = useMedplum();
  const patient = medplum.getProfile() as Patient;
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
          communications.entry?.map((entry, index) => {
            const comm = entry.resource as Communication;
            return {
              id: comm.id!,
              text: comm.payload?.[0]?.contentString || "",
              sender: comm.sender?.reference?.includes("Patient") ? "patient" : "doctor",
              timestamp: formatTimestamp(comm.sent ? new Date(comm.sent) : new Date()),
              threadId,
            };
          }) || [];

        setMessages(formattedMessages.reverse());
      } finally {
        setLoading(false);
      }
    };

    if (patient && threadId) {
      fetchMessages();
    }
  }, [medplum, patient, threadId]);

  const sendMessage = async () => {
    if (!message.trim() || !patient) return;

    let newCommunication: Communication = {
      resourceType: "Communication",
      status: "completed",
      sent: new Date().toISOString(),
      sender: {
        reference: `Patient/${patient.id}`,
        display:
          `${patient.name?.[0]?.given?.[0]} ${patient.name?.[0]?.family}`.trim() ||
          `Patient/${patient.id}`,
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
        sender: "patient",
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
    patient,
  };
}
