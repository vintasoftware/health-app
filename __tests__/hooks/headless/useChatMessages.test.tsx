import { createReference, getWebSocketUrl } from "@medplum/core";
import { Bundle, Communication, Patient, Practitioner } from "@medplum/fhirtypes";
import { MockClient, MockSubscriptionManager } from "@medplum/mock";
import { MedplumProvider } from "@medplum/react-hooks";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useChatMessages } from "@/hooks/headless/useChatMessages";

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
  status: "completed",
  sent: "2024-01-01T12:01:00Z",
  sender: createReference(mockPatient),
  payload: [{ contentString: "Hello" }],
  partOf: [createReference(mockThread)],
};

const mockMessage2: Communication = {
  resourceType: "Communication",
  id: "msg-2",
  status: "completed",
  sent: "2024-01-01T12:02:00Z",
  sender: createReference(mockPractitioner),
  payload: [{ contentString: "Hi there" }],
  partOf: [createReference(mockThread)],
};

async function createCommunicationSubBundle(communication: Communication): Promise<Bundle> {
  return {
    id: crypto.randomUUID(),
    resourceType: "Bundle",
    type: "history",
    timestamp: new Date().toISOString(),
    entry: [
      {
        resource: {
          id: crypto.randomUUID(),
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

describe("useChatMessages", () => {
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

  test("Loads and displays messages", async () => {
    const { medplum } = await setup();

    const { result } = renderHook(() => useChatMessages({ threadId: "test-thread" }), {
      wrapper: ({ children }) => <MedplumProvider medplum={medplum}>{children}</MedplumProvider>,
    });

    // Initially should be loading
    expect(result.current.loading).toBe(true);

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check messages are displayed
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].text).toBe("Hello");
    expect(result.current.messages[0].senderType).toBe("Patient");
    expect(result.current.messages[1].text).toBe("Hi there");
    expect(result.current.messages[1].senderType).toBe("Practitioner");
  });

  test("Sends new message", async () => {
    const { medplum } = await setup();
    const createSpy = jest.spyOn(medplum, "createResource");

    const { result } = renderHook(() => useChatMessages({ threadId: "test-thread" }), {
      wrapper: ({ children }) => <MedplumProvider medplum={medplum}>{children}</MedplumProvider>,
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
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
        status: "completed",
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
      expect(result.current.loading).toBe(false);
    });

    // Verify the new message appears in the list
    expect(result.current.messages[2].text).toBe("New message");
    expect(result.current.messages[2].senderType).toBe("Patient");
  });

  test("Does not send empty message", async () => {
    const { medplum } = await setup();
    const createSpy = jest.spyOn(medplum, "createResource");

    const { result } = renderHook(() => useChatMessages({ threadId: "test-thread" }), {
      wrapper: ({ children }) => <MedplumProvider medplum={medplum}>{children}</MedplumProvider>,
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.sendMessage();
    });

    expect(createSpy).not.toHaveBeenCalled();
  });

  test("Handles WebSocket disconnection and reconnection", async () => {
    const onWebSocketCloseMock = jest.fn();
    const onWebSocketOpenMock = jest.fn();
    const onSubscriptionConnectMock = jest.fn();
    const { medplum, subManager } = await setup();
    const { result } = renderHook(
      () =>
        useChatMessages({
          threadId: "test-thread",
          onWebSocketClose: onWebSocketCloseMock,
          onWebSocketOpen: onWebSocketOpenMock,
          onSubscriptionConnect: onSubscriptionConnectMock,
        }),
      {
        wrapper: ({ children }) => <MedplumProvider medplum={medplum}>{children}</MedplumProvider>,
      },
    );

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
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
    expect(result.current.messages).not.toHaveLength(3);

    // Emit subscription connected event
    act(() => {
      subManager.emitEventForCriteria(`Communication?part-of=Communication/test-thread`, {
        type: "connect",
        payload: { subscriptionId: "test-sub" },
      });
    });

    // Check reconnecting state was updated
    expect(result.current.reconnecting).toBe(false);

    // Check subscription connect callback was called
    expect(onSubscriptionConnectMock).toHaveBeenCalledTimes(1);

    // Wait for reconnection and message refresh
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.messages).toHaveLength(3);
    });

    // Verify the new message was fetched after reconnection
    expect(result.current.messages[2].text).toBe("Message while disconnected");
  });

  test("Handles real-time message incoming", async () => {
    const onMessageReceivedMock = jest.fn();
    const { medplum, subManager } = await setup();
    const { result } = renderHook(
      () => useChatMessages({ threadId: "test-thread", onMessageReceived: onMessageReceivedMock }),
      {
        wrapper: ({ children }) => <MedplumProvider medplum={medplum}>{children}</MedplumProvider>,
      },
    );

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
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
      subManager.emitEventForCriteria(`Communication?part-of=Communication/test-thread`, {
        type: "message",
        payload: bundle,
      });
    });

    // Verify the new message appears in real-time
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(3);
      expect(result.current.messages[2].text).toBe("Real-time incoming message");
    });

    // Verify the onMessageReceived callback was called
    expect(onMessageReceivedMock).toHaveBeenCalledTimes(1);
    expect(onMessageReceivedMock).toHaveBeenCalledWith(newMessage);
  });

  test("Ignores outgoing new message on subscription", async () => {
    const onMessageReceivedMock = jest.fn();
    const { medplum, subManager } = await setup();
    const { result } = renderHook(
      () => useChatMessages({ threadId: "test-thread", onMessageReceived: onMessageReceivedMock }),
      {
        wrapper: ({ children }) => <MedplumProvider medplum={medplum}>{children}</MedplumProvider>,
      },
    );

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
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
      subManager.emitEventForCriteria(`Communication?part-of=Communication/test-thread`, {
        type: "message",
        payload: bundle,
      });
    });

    // Verify the onMessageReceived callback was not called
    expect(onMessageReceivedMock).not.toHaveBeenCalled();
  });

  test("Updates existing message when receiving update via subscription", async () => {
    const { medplum, subManager } = await setup();
    const { result } = renderHook(() => useChatMessages({ threadId: "test-thread" }), {
      wrapper: ({ children }) => <MedplumProvider medplum={medplum}>{children}</MedplumProvider>,
    });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Update an existing message
    const updatedMessage = {
      ...mockMessage1,
      payload: [{ contentString: "Updated message" }],
    };

    // Update the resource and wait for it to be saved
    await medplum.updateResource(updatedMessage);

    // Create and emit the subscription bundle
    const bundle = await createCommunicationSubBundle(updatedMessage);
    act(() => {
      subManager.emitEventForCriteria(`Communication?part-of=Communication/test-thread`, {
        type: "message",
        payload: bundle,
      });
    });

    // Verify the message was updated
    await waitFor(() => {
      expect(result.current.messages[0].text).toBe("Updated message");
      expect(result.current.messages).toHaveLength(2);
    });
  });

  test("Messages cleared if profile changes", async () => {
    const mockOtherPatient: Patient = {
      resourceType: "Patient",
      id: "other-patient",
      name: [{ given: ["Jane"], family: "Doe" }],
    };
    const { medplum } = await setup();
    const { result } = renderHook(() => useChatMessages({ threadId: "test-thread" }), {
      wrapper: ({ children }) => <MedplumProvider medplum={medplum}>{children}</MedplumProvider>,
    });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify initial messages are loaded
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].text).toBe("Hello");
    expect(result.current.messages[1].text).toBe("Hi there");

    // Change the profile
    await act(async () => {
      medplum.setProfile(mockOtherPatient);
    });

    // Wait for loading to complete with new profile
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify messages are cleared
    expect(result.current.messages).toHaveLength(0);
  });
});
