import { createReference, generateId, getReferenceString, getWebSocketUrl } from "@medplum/core";
import { Bundle, Communication, Patient, Practitioner } from "@medplum/fhirtypes";
import { MockClient, MockSubscriptionManager } from "@medplum/mock";
import { MedplumProvider } from "@medplum/react-hooks";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { ChatProvider, useChat } from "@/contexts/ChatContext";
import { getQueryString } from "@/utils/url";

const mockPatient: Patient = {
  resourceType: "Patient",
  id: "test-patient",
  name: [{ given: ["John"], family: "Doe" }],
};

const mockPractitioner: Practitioner = {
  resourceType: "Practitioner",
  id: "test-practitioner",
  name: [{ given: ["Dr."], family: "Smith" }],
};

const mockThread: Communication = {
  resourceType: "Communication",
  id: "test-thread",
  status: "completed",
  sent: "2024-01-01T12:00:00Z",
  payload: [{ contentString: "Thread Topic" }],
};

const mockMessage1: Communication = {
  resourceType: "Communication",
  id: "msg-1",
  status: "in-progress",
  sent: "2024-01-01T12:01:00Z",
  sender: createReference(mockPatient),
  payload: [{ contentString: "Hello" }],
  partOf: [createReference(mockThread)],
};

const mockMessage2: Communication = {
  resourceType: "Communication",
  id: "msg-2",
  status: "in-progress",
  sent: "2024-01-01T12:02:00Z",
  sender: createReference(mockPractitioner),
  payload: [{ contentString: "Hi there" }],
  partOf: [createReference(mockThread)],
};

async function createCommunicationSubBundle(communication: Communication): Promise<Bundle> {
  return {
    id: generateId(),
    resourceType: "Bundle",
    type: "history",
    timestamp: new Date().toISOString(),
    entry: [
      {
        resource: {
          id: generateId(),
          resourceType: "SubscriptionStatus",
          status: "active",
          type: "event-notification",
          subscription: { reference: "Subscription/abc123" },
          notificationEvent: [
            {
              eventNumber: "0",
              timestamp: new Date().toISOString(),
              focus: createReference(communication),
            },
          ],
        },
      },
      {
        resource: communication,
        fullUrl: `https://api.medplum.com/fhir/R4/Communication/${communication.id as string}`,
      },
    ],
  };
}

describe("useChat (messages)", () => {
  async function setup(): Promise<{ medplum: MockClient; subManager: MockSubscriptionManager }> {
    const medplum = new MockClient({ profile: mockPatient });
    const subManager = new MockSubscriptionManager(
      medplum,
      getWebSocketUrl(medplum.getBaseUrl(), "/ws/subscriptions-r4"),
      { mockReconnectingWebSocket: true },
    );
    medplum.setSubscriptionManager(subManager);

    // Setup mock data
    await medplum.createResource(mockPatient);
    await medplum.createResource(mockThread);
    await medplum.createResource(mockMessage1);
    await medplum.createResource(mockMessage2);

    return { medplum, subManager };
  }

  // Helper function to create wrapper with both providers
  function createWrapper(
    medplum: MockClient,
    props: Partial<{
      onMessageReceived: (message: Communication) => void;
      onMessageUpdated: (message: Communication) => void;
      onWebSocketClose: () => void;
      onWebSocketOpen: () => void;
      onSubscriptionConnect: () => void;
      onError: (error: Error) => void;
    }> = {},
  ) {
    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <MedplumProvider medplum={medplum}>
        <ChatProvider {...props}>{children}</ChatProvider>
      </MedplumProvider>
    );
    return TestWrapper;
  }

  // Subscription criteria
  const criteria = getQueryString({
    "part-of:missing": true,
    subject: getReferenceString(mockPatient),
    _revinclude: "Communication:part-of",
  });

  // Test cases:
  test("Loads and displays messages", async () => {
    const { medplum } = await setup();

    const { result } = renderHook(() => useChat(), {
      wrapper: createWrapper(medplum),
    });

    // Select the thread
    act(() => {
      result.current.selectThread("test-thread");
    });

    // Initially should be loading
    expect(result.current.isLoadingMessages).toBe(true);

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
    });

    // Check messages are displayed
    expect(result.current.threadMessages).toHaveLength(2);
    expect(result.current.threadMessages[0].text).toBe("Hello");
    expect(result.current.threadMessages[0].senderType).toBe("Patient");
    expect(result.current.threadMessages[1].text).toBe("Hi there");
    expect(result.current.threadMessages[1].senderType).toBe("Practitioner");
  });

  test("Sends new message", async () => {
    const { medplum } = await setup();
    const createSpy = jest.spyOn(medplum, "createResource");

    const { result } = renderHook(() => useChat(), {
      wrapper: createWrapper(medplum),
    });

    // Select the thread
    act(() => {
      result.current.selectThread("test-thread");
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
    });

    // Set message and send
    act(() => {
      result.current.setMessage("New message");
    });

    expect(result.current.message).toBe("New message");

    await act(async () => {
      await result.current.sendMessage();
    });

    // Verify message was created
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: "Communication",
        status: "in-progress",
        sender: {
          reference: "Patient/test-patient",
          display: "John Doe",
        },
        payload: [{ contentString: "New message" }],
        partOf: [{ reference: "Communication/test-thread" }],
      }),
    );

    // Wait for messages to update
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
    });

    // Verify the new message appears in the list
    expect(result.current.threadMessages[2].text).toBe("New message");
    expect(result.current.threadMessages[2].senderType).toBe("Patient");
  });

  test("Does not send empty message", async () => {
    const { medplum } = await setup();
    const createSpy = jest.spyOn(medplum, "createResource");

    const { result } = renderHook(() => useChat(), {
      wrapper: createWrapper(medplum),
    });

    // Select the thread
    act(() => {
      result.current.selectThread("test-thread");
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
    });

    await act(async () => {
      await result.current.sendMessage();
    });

    expect(createSpy).not.toHaveBeenCalled();
  });

  test("Handles real-time message incoming", async () => {
    const onMessageReceivedMock = jest.fn();
    const { medplum, subManager } = await setup();
    const { result } = renderHook(() => useChat(), {
      wrapper: createWrapper(medplum, { onMessageReceived: onMessageReceivedMock }),
    });

    // Select the thread
    act(() => {
      result.current.selectThread("test-thread");
    });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
    });

    // Emit that subscription is connected
    act(() => {
      subManager.emitEventForCriteria(`Communication?${criteria}`, {
        type: "connect",
        payload: { subscriptionId: generateId() },
      });
    });

    // Wait for connectedOnce to be true
    await waitFor(() => {
      expect(result.current.connectedOnce).toBe(true);
    });

    // Create a new message
    const newMessage: Communication = {
      resourceType: "Communication",
      id: "msg-3",
      status: "completed",
      sent: "2024-01-01T12:03:00Z",
      sender: createReference(mockPractitioner),
      payload: [{ contentString: "Real-time incoming message" }],
      partOf: [createReference(mockThread)],
    };

    // Create the resource and wait for it to be saved
    await medplum.createResource(newMessage);

    // Create and emit the subscription bundle
    const bundle = await createCommunicationSubBundle(newMessage);
    act(() => {
      subManager.emitEventForCriteria(`Communication?${criteria}`, {
        type: "message",
        payload: bundle,
      });
    });

    // Verify the new message appears in real-time
    await waitFor(() => {
      expect(result.current.threadMessages).toHaveLength(3);
      expect(result.current.threadMessages[2].text).toBe("Real-time incoming message");
    });

    // Verify the onMessageReceived callback was called
    expect(onMessageReceivedMock).toHaveBeenCalledTimes(1);
    expect(onMessageReceivedMock).toHaveBeenCalledWith(expect.objectContaining(newMessage));
  });

  test("Ignores outgoing new message on subscription", async () => {
    const onMessageReceivedMock = jest.fn();
    const { medplum, subManager } = await setup();
    const { result } = renderHook(() => useChat(), {
      wrapper: createWrapper(medplum, { onMessageReceived: onMessageReceivedMock }),
    });

    // Select the thread
    act(() => {
      result.current.selectThread("test-thread");
    });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
    });

    // Create a new message
    const newMessage: Communication = {
      resourceType: "Communication",
      id: "msg-3",
      status: "completed",
      sent: "2024-01-01T12:03:00Z",
      sender: createReference(mockPatient),
      payload: [{ contentString: "Real-time outgoing message" }],
      partOf: [createReference(mockThread)],
    };

    // Create and emit the subscription bundle
    const bundle = await createCommunicationSubBundle(newMessage);
    act(() => {
      subManager.emitEventForCriteria(`Communication?${criteria}`, {
        type: "message",
        payload: bundle,
      });
    });

    // Verify the onMessageReceived callback was not called
    expect(onMessageReceivedMock).not.toHaveBeenCalled();
  });

  test("Updates existing message when receiving update via subscription", async () => {
    const onMessageUpdatedMock = jest.fn();
    const { medplum, subManager } = await setup();
    const { result } = renderHook(() => useChat(), {
      wrapper: createWrapper(medplum, { onMessageUpdated: onMessageUpdatedMock }),
    });

    // Select the thread
    act(() => {
      result.current.selectThread("test-thread");
    });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
    });

    // Update an existing message
    const updatedMessage = {
      ...mockMessage2,
      payload: [{ contentString: "Updated message" }],
    };

    // Update the resource and wait for it to be saved
    await medplum.updateResource(updatedMessage);

    // Create and emit the subscription bundle
    const bundle = await createCommunicationSubBundle(updatedMessage);
    act(() => {
      subManager.emitEventForCriteria(`Communication?${criteria}`, {
        type: "message",
        payload: bundle,
      });
    });

    // Verify the message was updated
    await waitFor(() => {
      expect(result.current.threadMessages[1].text).toBe("Updated message");
      expect(result.current.threadMessages).toHaveLength(2);
    });

    // Verify the onMessageUpdated callback was called
    expect(onMessageUpdatedMock).toHaveBeenCalledTimes(1);
    expect(onMessageUpdatedMock).toHaveBeenCalledWith(expect.objectContaining(updatedMessage));
  });

  test("Messages cleared if profile changes", async () => {
    const mockOtherPatient: Patient = {
      resourceType: "Patient",
      id: "other-patient",
      name: [{ given: ["Jane"], family: "Doe" }],
    };
    const { medplum } = await setup();
    const { result } = renderHook(() => useChat(), {
      wrapper: createWrapper(medplum),
    });

    // Select the thread
    act(() => {
      result.current.selectThread("test-thread");
    });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
    });

    // Verify initial messages are loaded
    expect(result.current.threadMessages).toHaveLength(2);
    expect(result.current.threadMessages[0].text).toBe("Hello");
    expect(result.current.threadMessages[1].text).toBe("Hi there");

    // Change the profile
    await act(async () => {
      medplum.setProfile(mockOtherPatient);
    });

    // Wait for loading to complete with new profile
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
    });

    // Verify messages are cleared
    expect(result.current.threadMessages).toHaveLength(0);
  });

  test("Handles WebSocket disconnection and reconnection", async () => {
    const onWebSocketCloseMock = jest.fn();
    const onWebSocketOpenMock = jest.fn();
    const onSubscriptionConnectMock = jest.fn();
    const { medplum, subManager } = await setup();
    const { result } = renderHook(() => useChat(), {
      wrapper: createWrapper(medplum, {
        onWebSocketClose: onWebSocketCloseMock,
        onWebSocketOpen: onWebSocketOpenMock,
        onSubscriptionConnect: onSubscriptionConnectMock,
      }),
    });

    // Select the thread
    act(() => {
      result.current.selectThread("test-thread");
    });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
    });

    // Simulate WebSocket disconnection
    act(() => {
      subManager.closeWebSocket();
    });

    // Wait for reconnecting state to update
    await waitFor(() => {
      expect(result.current.reconnecting).toBe(true);
    });

    // Check close callback was called
    expect(onWebSocketCloseMock).toHaveBeenCalledTimes(1);

    // Create a new message while disconnected
    const newMessage: Communication = {
      resourceType: "Communication",
      id: "msg-3",
      status: "completed",
      sent: "2024-01-01T12:03:00Z",
      sender: createReference(mockPractitioner),
      payload: [{ contentString: "Message while disconnected" }],
      partOf: [createReference(mockThread)],
    };
    await medplum.createResource(newMessage);

    // Simulate WebSocket reconnection
    act(() => {
      subManager.openWebSocket();
    });

    // Check open callback was called
    expect(onWebSocketOpenMock).toHaveBeenCalledTimes(1);

    // New message should not be in chat yet
    expect(result.current.threadMessages).not.toHaveLength(3);

    // Emit subscription connected event
    act(() => {
      subManager.emitEventForCriteria(`Communication?${criteria}`, {
        type: "connect",
        payload: { subscriptionId: generateId() },
      });
    });

    // Check reconnecting state was updated
    expect(result.current.reconnecting).toBe(false);

    // Check subscription connect callback was called
    expect(onSubscriptionConnectMock).toHaveBeenCalledTimes(1);

    // Wait for reconnection and message refresh
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
      expect(result.current.threadMessages).toHaveLength(3);
    });

    // Verify the new message was fetched after reconnection
    expect(result.current.threadMessages[2].text).toBe("Message while disconnected");
  });

  test("Calls onError callback when subscription error occurs", async () => {
    const onErrorMock = jest.fn();
    const { medplum, subManager } = await setup();
    const { result } = renderHook(() => useChat(), {
      wrapper: createWrapper(medplum, { onError: onErrorMock }),
    });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
    });

    // Emit error event on subscription
    act(() => {
      subManager.emitEventForCriteria(`Communication?${criteria}`, {
        type: "error",
        payload: new Error("Subscription error occurred"),
      });
    });

    // Verify the onError callback was called with the error
    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledWith(new Error("Subscription error occurred"));
  });

  test("Calls onError on first load if search fails", async () => {
    const onErrorMock = jest.fn();
    const { medplum } = await setup();
    const searchSpy = jest.spyOn(medplum, "searchResources");

    // Mock search to throw an error
    const error = new Error("Failed to load messages");
    searchSpy.mockRejectedValue(error);

    const { result } = renderHook(() => useChat(), {
      wrapper: createWrapper(medplum, { onError: onErrorMock }),
    });

    // Select the thread
    act(() => {
      result.current.selectThread("test-thread");
    });

    // Initially should be loading
    expect(result.current.isLoadingMessages).toBe(true);

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
    });

    // Verify the onError callback was called with the error
    expect(onErrorMock).toHaveBeenCalledWith(error);
    expect(onErrorMock).toHaveBeenCalledTimes(1);

    // Verify no messages were loaded
    expect(result.current.threadMessages).toHaveLength(0);
  });

  test("New message starts with sent status only", async () => {
    const { medplum } = await setup();
    const { result } = renderHook(() => useChat(), {
      wrapper: createWrapper(medplum),
    });

    // Select the thread
    act(() => {
      result.current.selectThread("test-thread");
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
    });

    // Send a new message
    act(() => {
      result.current.setMessage("New message");
    });
    await act(async () => {
      await result.current.sendMessage();
    });

    // Wait for messages to update
    await waitFor(() => {
      const lastMessage = result.current.threadMessages[result.current.threadMessages.length - 1];
      expect(lastMessage.sentAt).toBeDefined();
      expect(lastMessage.received).toBeUndefined();
      expect(lastMessage.read).toBe(false);
    });
  });

  test("Received status is set when messages are rendered first time", async () => {
    const { medplum } = await setup();

    // Create a new message from practitioner without received status
    const newMessage: Communication = {
      resourceType: "Communication",
      id: "msg-3",
      status: "in-progress",
      sent: new Date().toISOString(),
      sender: createReference(mockPractitioner),
      payload: [{ contentString: "Test initial received status" }],
      partOf: [createReference(mockThread)],
    };
    await medplum.createResource(newMessage);

    const { result } = renderHook(() => useChat(), {
      wrapper: createWrapper(medplum),
    });

    // Select the thread
    act(() => {
      result.current.selectThread("test-thread");
    });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
    });

    // Verify the message in the list has received status
    await waitFor(() => {
      const message = result.current.threadMessages.find((m) => m.id === "msg-3");
      expect(message?.received).toBeDefined();
      expect(message?.read).toBe(false);
    });
  });

  test("Received status is set when message is received by other user", async () => {
    const { medplum, subManager } = await setup();
    const { result } = renderHook(() => useChat(), {
      wrapper: createWrapper(medplum),
    });

    // Select the thread
    act(() => {
      result.current.selectThread("test-thread");
    });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
    });

    // Create a new incoming message without received status
    const newMessage: Communication = {
      resourceType: "Communication",
      id: "msg-3",
      status: "in-progress",
      sent: new Date().toISOString(),
      sender: createReference(mockPractitioner),
      payload: [{ contentString: "Test received status" }],
      partOf: [createReference(mockThread)],
    };
    await medplum.createResource(newMessage);

    // Create and emit the subscription bundle
    const bundle = await createCommunicationSubBundle(newMessage);
    act(() => {
      subManager.emitEventForCriteria(`Communication?${criteria}`, {
        type: "message",
        payload: bundle,
      });
    });

    // Verify received timestamp is set
    await waitFor(() => {
      const lastMessage = result.current.threadMessages[result.current.threadMessages.length - 1];
      expect(lastMessage.text).toBe("Test received status");
      expect(lastMessage.received).toBeDefined();
      expect(lastMessage.read).toBe(false);
    });
  });

  test("Read status is set when markMessageAsRead is called", async () => {
    const { medplum } = await setup();
    const { result } = renderHook(() => useChat(), {
      wrapper: createWrapper(medplum),
    });

    // Select the thread
    act(() => {
      result.current.selectThread("test-thread");
    });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
    });

    // Get an unread message
    const unreadMessage = result.current.threadMessages.find((m) => m.id === "msg-2");
    expect(unreadMessage).toBeDefined();

    // Mark message as read
    await act(async () => {
      await result.current.markMessageAsRead(unreadMessage!.id);
    });

    // Verify message is marked as read
    await waitFor(() => {
      const message = result.current.threadMessages.find((m) => m.id === unreadMessage!.id);
      expect(message?.read).toBe(true);
    });
  });

  test("markMessageAsRead does nothing if message is already read", async () => {
    const { medplum } = await setup();

    // Create a new message from practitioner with read status (completed)
    const newMessage: Communication = {
      resourceType: "Communication",
      id: "msg-3",
      status: "completed",
      sent: new Date().toISOString(),
      sender: createReference(mockPractitioner),
      payload: [{ contentString: "Test received status" }],
      partOf: [createReference(mockThread)],
    };
    await medplum.createResource(newMessage);

    // Render the hook
    const { result } = renderHook(() => useChat(), {
      wrapper: createWrapper(medplum),
    });

    // Select the thread
    act(() => {
      result.current.selectThread("test-thread");
    });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
      const message = result.current.threadMessages.find((m) => m.id === newMessage.id);
      expect(message?.read).toBe(true);
    });

    // Mark message as read
    await act(async () => {
      await result.current.markMessageAsRead(newMessage.id!);
    });

    // Verify message is still marked as read
    await waitFor(() => {
      const message = result.current.threadMessages.find((m) => m.id === newMessage.id);
      expect(message?.read).toBe(true);
    });
  });

  test("markMessageAsRead does nothing if message is outgoing", async () => {
    const { medplum } = await setup();

    const { result } = renderHook(() => useChat(), {
      wrapper: createWrapper(medplum),
    });

    // Select the thread
    act(() => {
      result.current.selectThread("test-thread");
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
    });

    // Try to mark an outgoing message as read
    const unreadMessage = result.current.threadMessages.find((m) => m.id === "msg-1");
    await act(async () => {
      await result.current.markMessageAsRead(unreadMessage!.id);
    });

    // Verify message is still marked as not read
    await waitFor(() => {
      const message = result.current.threadMessages.find((m) => m.id === unreadMessage!.id);
      expect(message?.read).toBe(false);
    });
  });
});