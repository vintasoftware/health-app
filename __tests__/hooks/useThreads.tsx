import { createReference, generateId, getReferenceString, getWebSocketUrl } from "@medplum/core";
import { Bundle, Communication, Patient, Practitioner } from "@medplum/fhirtypes";
import { MockClient, MockSubscriptionManager } from "@medplum/mock";
import { MedplumProvider } from "@medplum/react-hooks";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { ChatProvider } from "@/contexts/ChatContext";
import { useChatConnectionState } from "@/hooks/useChatConnectionState";
import { useThreads } from "@/hooks/useThreads";
import { getQueryString } from "@/utils/url";

const mockPatient: Patient = {
  resourceType: "Patient",
  id: "test-patient",
  name: [{ given: ["John"], family: "Doe" }],
};

const mockPractitioner: Practitioner = {
  resourceType: "Practitioner",
  id: "test-practitioner",
  name: [{ given: ["Dr"], family: "Smith" }],
};

const mockThread1: Communication = {
  resourceType: "Communication",
  id: "test-thread-1",
  status: "completed",
  sent: "2024-01-01T12:00:00Z",
  payload: [{ contentString: "Thread 1 Topic" }],
  extension: [{ url: "https://medplum.com/last-changed", valueDateTime: "2024-01-01T12:00:00Z" }],
};

const mockMessage1: Communication = {
  resourceType: "Communication",
  id: "test-msg-1",
  status: "completed",
  sent: "2024-01-01T12:01:00Z",
  sender: createReference(mockPatient),
  payload: [{ contentString: "First message" }],
  partOf: [createReference(mockThread1)],
};

const mockMessage2: Communication = {
  resourceType: "Communication",
  id: "test-msg-2",
  status: "completed",
  sent: "2024-01-01T12:02:00Z",
  sender: createReference(mockPatient),
  payload: [{ contentString: "Last message" }],
  partOf: [createReference(mockThread1)],
};

const mockThread2: Communication = {
  resourceType: "Communication",
  id: "test-thread-2",
  status: "completed",
  sent: "2024-01-02T12:00:00Z",
  payload: [{ contentString: "Thread 2 Topic" }],
  extension: [{ url: "https://medplum.com/last-changed", valueDateTime: "2024-01-02T12:00:00Z" }],
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
        fullUrl: `https://api.medplum.com/fhir/R4/Communication/${communication.id!}`,
      },
    ],
  };
}

describe("useThreads", () => {
  async function setup(
    profile: Patient | Practitioner = mockPatient,
  ): Promise<{ medplum: MockClient; subManager: MockSubscriptionManager }> {
    const medplum = new MockClient({ profile });
    const subManager = new MockSubscriptionManager(
      medplum,
      getWebSocketUrl(medplum.getBaseUrl(), "/ws/subscriptions-r4"),
      { mockReconnectingWebSocket: true },
    );
    medplum.setSubscriptionManager(subManager);

    // Setup mock data
    await medplum.createResource(mockPatient);
    await medplum.createResource(mockThread1);
    await medplum.createResource(mockMessage1);
    await medplum.createResource(mockMessage2);
    await medplum.createResource(mockThread2);

    return { medplum, subManager };
  }

  // Helper function to create wrapper with both providers
  function createWrapper(
    medplum: MockClient,
    props: Partial<{
      onError: (error: Error) => void;
      onWebSocketClose: () => void;
      onWebSocketOpen: () => void;
      onSubscriptionConnect: () => void;
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
  });

  // Test cases:
  test("Loads and displays threads for patient", async () => {
    const { medplum } = await setup();
    const searchSpy = jest.spyOn(medplum, "search");

    // Mock the search implementation to return results with search modes
    // (the default mock client doesn't support search modes)
    searchSpy.mockResolvedValue({
      resourceType: "Bundle",
      type: "searchset",
      entry: [
        {
          search: { mode: "match" },
          resource: mockThread1,
        },
        {
          search: { mode: "include" },
          resource: mockMessage1,
        },
        {
          search: { mode: "include" },
          resource: mockMessage2,
        },
        {
          search: { mode: "match" },
          resource: mockThread2,
        },
      ],
    });

    const { result } = renderHook(() => useThreads(), {
      wrapper: createWrapper(medplum),
    });

    // Initially should be loading
    expect(result.current.isLoading).toBe(true);

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify search was called correctly
    expect(searchSpy).toHaveBeenCalledWith(
      "Communication",
      {
        "part-of:missing": true,
        subject: "Patient/test-patient",
        _revinclude: "Communication:part-of",
        _sort: "-sent",
      },
      {
        cache: "no-cache",
      },
    );

    // Check threads are displayed correctly
    expect(result.current.threads).toHaveLength(2);
    expect(result.current.threads[0]).toMatchObject({
      id: "test-thread-2",
      topic: "Thread 2 Topic",
      lastMessage: undefined,
      lastMessageSentAt: undefined,
    });
    expect(result.current.threads[1]).toMatchObject({
      id: "test-thread-1",
      topic: "Thread 1 Topic",
      lastMessage: "Last message",
      lastMessageSentAt: new Date(mockMessage2.sent!),
    });
  });

  test("Handles no threads", async () => {
    const { medplum } = await setup();
    const searchSpy = jest.spyOn(medplum, "search");

    // Mock empty search results
    searchSpy.mockResolvedValue({
      resourceType: "Bundle",
      type: "searchset",
      entry: [],
      link: [
        {
          relation: "self",
          url: "https://api.medplum.com/fhir/R4/Communication?_count=100&_revinclude=Communication:part-of&_sort=-sent&part-of:missing=true",
        },
      ],
    });

    const { result } = renderHook(() => useThreads(), {
      wrapper: createWrapper(medplum),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.threads).toEqual([]);
    expect(searchSpy).toHaveBeenCalled();
  });

  test("Loads all threads for practitioner", async () => {
    const { medplum } = await setup(mockPractitioner);
    const searchSpy = jest.spyOn(medplum, "search");

    const { result } = renderHook(() => useThreads(), {
      wrapper: createWrapper(medplum),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(searchSpy).toHaveBeenCalledWith(
      "Communication",
      {
        "part-of:missing": true,
        subject: undefined,
        _revinclude: "Communication:part-of",
        _sort: "-sent",
      },
      expect.objectContaining({
        cache: "no-cache",
      }),
    );
  });

  test("Creates new thread successfully", async () => {
    const { medplum } = await setup();
    const createSpy = jest.spyOn(medplum, "createResource");

    const { result } = renderHook(() => useThreads(), {
      wrapper: createWrapper(medplum),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newThreadId = await act(async () => {
      return await result.current.createThread("New Thread Topic");
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: "Communication",
        status: "completed",
        sender: {
          reference: "Patient/test-patient",
          display: "John Doe",
        },
        subject: {
          reference: "Patient/test-patient",
          display: "John Doe",
        },
        payload: [{ contentString: "New Thread Topic" }],
      }),
    );

    const callArgs = createSpy.mock.calls[0][0] as Communication;
    expect(callArgs.sent).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    expect(newThreadId).toBeDefined();
    expect(result.current.threads[0]).toEqual(
      expect.objectContaining({
        id: newThreadId,
        topic: "New Thread Topic",
      }),
    );
  });

  test("Prevents non-patient from creating thread", async () => {
    const { medplum } = await setup(mockPractitioner);

    const { result } = renderHook(() => useThreads(), {
      wrapper: createWrapper(medplum),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(result.current.createThread("New Thread")).rejects.toThrow(
      "Only patients can create threads",
    );
  });

  test("Does not create thread with empty topic", async () => {
    const { medplum } = await setup();
    const createSpy = jest.spyOn(medplum, "createResource");

    const { result } = renderHook(() => useThreads(), {
      wrapper: createWrapper(medplum),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const threadId = await result.current.createThread("   ");
    expect(threadId).toBeUndefined();
    expect(createSpy).not.toHaveBeenCalled();
  });

  test("Orders threads correctly by last activity", async () => {
    const { medplum } = await setup();
    const searchSpy = jest.spyOn(medplum, "search");

    // Create threads with different timestamps
    const thread1 = {
      resourceType: "Communication",
      id: "thread-1",
      status: "completed",
      sent: "2024-01-01T12:00:00Z",
      payload: [{ contentString: "Thread 1" }],
    } satisfies Communication;

    const thread1Message = {
      resourceType: "Communication",
      id: "msg-1",
      status: "completed",
      sent: "2024-01-01T14:00:00Z", // Last activity for thread 1
      sender: createReference(mockPatient),
      payload: [{ contentString: "Message in thread 1" }],
      partOf: [{ reference: "Communication/thread-1" }],
    } satisfies Communication;

    const thread2 = {
      resourceType: "Communication",
      id: "thread-2",
      status: "completed",
      sent: "2024-01-01T13:00:00Z", // Last activity for thread 2 (no messages)
      payload: [{ contentString: "Thread 2" }],
    } satisfies Communication;

    const thread3 = {
      resourceType: "Communication",
      id: "thread-3",
      status: "completed",
      sent: "2024-01-01T12:00:00Z",
      payload: [{ contentString: "Thread 3" }],
    } satisfies Communication;

    const thread3Message = {
      resourceType: "Communication",
      id: "msg-3",
      status: "completed",
      sent: "2024-01-01T15:00:00Z", // Last activity for thread 3
      sender: createReference(mockPatient),
      payload: [{ contentString: "Message in thread 3" }],
      partOf: [{ reference: "Communication/thread-3" }],
    } satisfies Communication;

    // Mock search results with specific order
    searchSpy.mockResolvedValue({
      resourceType: "Bundle",
      type: "searchset",
      entry: [
        { search: { mode: "match" }, resource: thread1 },
        { search: { mode: "include" }, resource: thread1Message },
        { search: { mode: "match" }, resource: thread2 },
        { search: { mode: "match" }, resource: thread3 },
        { search: { mode: "include" }, resource: thread3Message },
      ],
    });

    const { result } = renderHook(() => useThreads(), {
      wrapper: createWrapper(medplum),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify threads are ordered by last activity (message sent time or thread creation time)
    expect(result.current.threads).toHaveLength(3);
    expect(result.current.threads[0].id).toBe("thread-3"); // Latest activity at 15:00
    expect(result.current.threads[1].id).toBe("thread-1"); // Latest activity at 14:00
    expect(result.current.threads[2].id).toBe("thread-2"); // Latest activity at 13:00

    // Verify thread details
    expect(result.current.threads[0]).toEqual(
      expect.objectContaining({
        id: "thread-3",
        topic: "Thread 3",
        lastMessage: "Message in thread 3",
        lastMessageSentAt: new Date(thread3Message.sent!),
      }),
    );

    expect(result.current.threads[1]).toEqual(
      expect.objectContaining({
        id: "thread-1",
        topic: "Thread 1",
        lastMessage: "Message in thread 1",
        lastMessageSentAt: new Date(thread1Message.sent!),
      }),
    );

    expect(result.current.threads[2]).toEqual(
      expect.objectContaining({
        id: "thread-2",
        topic: "Thread 2",
        lastMessage: undefined,
        lastMessageSentAt: undefined,
      }),
    );
  });

  test("Handles real-time thread updates", async () => {
    const { medplum, subManager } = await setup();
    const searchSpy = jest.spyOn(medplum, "search");

    // Mock the search implementation to return results with search modes
    // (the default mock client doesn't support search modes)
    searchSpy.mockResolvedValue({
      resourceType: "Bundle",
      type: "searchset",
      entry: [
        {
          search: { mode: "match" },
          resource: mockThread1,
        },
        {
          search: { mode: "include" },
          resource: mockMessage1,
        },
        {
          search: { mode: "include" },
          resource: mockMessage2,
        },
        {
          search: { mode: "match" },
          resource: mockThread2,
        },
      ],
    });

    const { result } = renderHook(() => useThreads(), {
      wrapper: createWrapper(medplum),
    });
    const { result: connectionResult } = renderHook(() => useChatConnectionState(), {
      wrapper: createWrapper(medplum),
    });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
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
      expect(connectionResult.current.connectedOnce).toBe(true);
    });

    // Create a new message in an existing thread
    const newMessage: Communication = {
      resourceType: "Communication",
      id: "msg-3",
      status: "completed",
      sent: "2024-01-01T12:03:00Z",
      sender: createReference(mockPatient),
      payload: [{ contentString: "New message in thread" }],
      partOf: [createReference(mockThread1)],
    };

    // Create the resource and wait for it to be saved
    await medplum.createResource(newMessage);

    // Mock the search implementation for messages of thread 1
    searchSpy.mockResolvedValue({
      resourceType: "Bundle",
      type: "searchset",
      entry: [
        {
          search: { mode: "match" },
          resource: mockMessage1,
        },
        {
          search: { mode: "match" },
          resource: mockMessage2,
        },
        {
          search: { mode: "match" },
          resource: newMessage,
        },
      ],
    });

    // Create and emit the subscription bundle
    const bundle = await createCommunicationSubBundle(mockThread1);
    act(() => {
      subManager.emitEventForCriteria(`Communication?${criteria}`, {
        type: "message",
        payload: bundle,
      });
    });

    // Verify the thread list was updated with the new message
    await waitFor(() => {
      const updatedThread = result.current.threads.find((t) => t.id === mockThread1.id);
      expect(updatedThread?.lastMessage).toBe("New message in thread");
      expect(updatedThread?.lastMessageSentAt).toEqual(new Date(newMessage.sent!));
    });
  });

  test("Threads cleared if profile changes", async () => {
    const { medplum } = await setup(mockPractitioner);

    // Mock the search implementation
    const searchSpy = jest.spyOn(medplum, "search");
    searchSpy.mockResolvedValue({
      resourceType: "Bundle",
      type: "searchset",
      entry: [
        {
          search: { mode: "match" },
          resource: mockThread1,
        },
        {
          search: { mode: "match" },
          resource: mockThread2,
        },
      ],
    });

    const { result } = renderHook(() => useThreads(), {
      wrapper: createWrapper(medplum),
    });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify initial threads are loaded
    expect(result.current.threads).toHaveLength(2);
    expect(result.current.threads[0].id).toBe("test-thread-2");
    expect(result.current.threads[1].id).toBe("test-thread-1");

    // Mock the search implementation to return no threads
    searchSpy.mockResolvedValue({
      resourceType: "Bundle",
      type: "searchset",
      entry: [],
    });

    // Change the profile
    await act(async () => {
      medplum.setProfile(mockPatient);
    });

    // Wait for loading to complete with new profile
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify threads are cleared
    expect(result.current.threads).toEqual([]);
  });

  test("Handles WebSocket disconnection and reconnection", async () => {
    const onWebSocketCloseMock = jest.fn();
    const onWebSocketOpenMock = jest.fn();
    const onSubscriptionConnectMock = jest.fn();
    const { medplum, subManager } = await setup();
    const searchSpy = jest.spyOn(medplum, "search");

    const { result } = renderHook(() => useThreads(), {
      wrapper: createWrapper(medplum, {
        onWebSocketClose: onWebSocketCloseMock,
        onWebSocketOpen: onWebSocketOpenMock,
        onSubscriptionConnect: onSubscriptionConnectMock,
      }),
    });
    const { result: connectionResult } = renderHook(() => useChatConnectionState(), {
      wrapper: createWrapper(medplum),
    });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Simulate WebSocket disconnection
    act(() => {
      subManager.closeWebSocket();
    });

    // Wait for reconnecting state to update
    await waitFor(() => {
      expect(connectionResult.current.reconnecting).toBe(true);
    });

    // Check close callback was called
    expect(onWebSocketCloseMock).toHaveBeenCalledTimes(1);

    // Create a new thread while disconnected
    const newThread: Communication = {
      resourceType: "Communication",
      id: "thread-new",
      status: "completed",
      sent: "2024-01-01T12:03:00Z",
      sender: createReference(mockPatient),
      payload: [{ contentString: "Thread created while disconnected" }],
    };
    await medplum.createResource(newThread);

    // Mock the search implementation to return the new thread
    searchSpy.mockResolvedValue({
      resourceType: "Bundle",
      type: "searchset",
      entry: [
        {
          search: { mode: "match" },
          resource: newThread,
        },
      ],
    });

    // Simulate WebSocket reconnection
    act(() => {
      subManager.openWebSocket();
    });

    // Check open callback was called
    expect(onWebSocketOpenMock).toHaveBeenCalledTimes(1);

    // New thread should not be in list yet
    expect(result.current.threads.find((t) => t.id === "thread-new")).toBeUndefined();

    // Emit subscription connected event
    act(() => {
      subManager.emitEventForCriteria(`Communication?${criteria}`, {
        type: "connect",
        payload: { subscriptionId: generateId() },
      });
    });

    // Check reconnecting state was updated
    expect(connectionResult.current.reconnecting).toBe(false);

    // Check subscription connect callback was called
    expect(onSubscriptionConnectMock).toHaveBeenCalledTimes(1);

    // Wait for reconnection and thread refresh
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      const newThreadInList = result.current.threads.find((t) => t.id === "thread-new");
      expect(newThreadInList).toBeDefined();
      expect(newThreadInList!.topic).toBe("Thread created while disconnected");
    });
  });

  test("Calls onError callback when subscription error occurs", async () => {
    const onErrorMock = jest.fn();
    const { medplum, subManager } = await setup();

    const { result } = renderHook(() => useThreads(), {
      wrapper: createWrapper(medplum, { onError: onErrorMock }),
    });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
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
    const searchSpy = jest.spyOn(medplum, "search");

    // Mock search to throw an error
    const error = new Error("Failed to load threads");
    searchSpy.mockRejectedValue(error);

    const { result } = renderHook(() => useThreads(), {
      wrapper: createWrapper(medplum, { onError: onErrorMock }),
    });

    // Initially should be loading
    expect(result.current.isLoading).toBe(true);

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify the onError callback was called with the error
    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledWith(error);

    // Verify no threads were loaded
    expect(result.current.threads).toEqual([]);
  });
});
