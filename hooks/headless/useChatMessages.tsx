import { useState, useEffect } from "react";
import { useMedplum } from "@medplum/react-hooks";
import { Communication, Patient } from "@medplum/fhirtypes";

export interface ChatMessage {
  id: number;
  text: string;
  sender: string;
  timestamp: string;
}

function formatTimestamp(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function useChatMessages() {
  const medplum = useMedplum();
  const patient = medplum.getProfile() as Patient;
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch existing messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const communications = await medplum.search("Communication", {
          _sort: "-sent",
          _count: "100",
        });

        const formattedMessages =
          communications.entry?.map((entry, index) => {
            const comm = entry.resource as Communication;
            return {
              id: index + 1,
              text: comm.payload?.[0]?.contentString || "",
              sender: comm.sender?.reference?.includes("Patient") ? "patient" : "doctor",
              timestamp: formatTimestamp(comm.sent ? new Date(comm.sent) : new Date()),
            };
          }) || [];

        setMessages(formattedMessages.reverse());
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    if (patient) {
      fetchMessages();
    }
  }, [medplum, patient]);

  const sendMessage = async () => {
    if (!message.trim() || !patient) return;

    try {
      const newCommunication: Communication = {
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
      };
      await medplum.createResource(newCommunication);

      setMessages([
        ...messages,
        {
          id: messages.length + 1,
          text: message,
          sender: "patient",
          timestamp: formatTimestamp(new Date()),
        },
      ]);
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
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
