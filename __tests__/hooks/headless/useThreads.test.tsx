import { createReference } from "@medplum/core";
import { Communication, Patient, Practitioner } from "@medplum/fhirtypes";
import { MockClient } from "@medplum/mock";
import { MedplumProvider } from "@medplum/react-hooks";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useThreads } from "@/hooks/headless/useThreads";
import { formatTime } from "@/utils/datetime";

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
};

describe("useThreads", () => {
  async function setup(profile: Patient | Practitioner = mockPatient): Promise<MockClient> {
    const medplum = new MockClient({ profile });

    // Setup mock data
    await medplum.createResource(mockPatient);
    await medplum.createResource(mockThread1);
    await medplum.createResource(mockMessage1);
    await medplum.createResource(mockMessage2);
    await medplum.createResource(mockThread2);

    return medplum;
  }

  test("Loads and displays threads for patient", async () => {
    const medplum = await setup();
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
      wrapper: ({ children }) => <MedplumProvider medplum={medplum}>{children}</MedplumProvider>,
    });

    // Initially should be loading
    expect(result.current.loading).toBe(true);

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify search was called correctly
    expect(searchSpy).toHaveBeenCalledWith("Communication", {
      "part-of:missing": true,
      subject: "Patient/test-patient",
      _revinclude: "Communication:part-of",
      _sort: "-sent",
      _count: "100",
    });

    // Check threads are displayed correctly
    expect(result.current.threads).toHaveLength(2);
    expect(result.current.threads[0]).toMatchObject({
      id: "test-thread-2",
      topic: "Thread 2 Topic",
      lastMessage: undefined,
      lastMessageTime: undefined,
    });
    expect(result.current.threads[1]).toMatchObject({
      id: "test-thread-1",
      topic: "Thread 1 Topic",
      lastMessage: "Last message",
      lastMessageTime: formatTime(new Date(mockMessage2.sent!)),
    });
  });

  test("Handles no threads", async (profile: Patient | Practitioner = mockPatient) => {
    const medplum = new MockClient({ profile });
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
      wrapper: ({ children }) => <MedplumProvider medplum={medplum}>{children}</MedplumProvider>,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.threads).toEqual([]);
    expect(searchSpy).toHaveBeenCalled();
  });

  test("Loads all threads for practitioner", async () => {
    const medplum = await setup(mockPractitioner);
    const searchSpy = jest.spyOn(medplum, "search");

    const { result } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => <MedplumProvider medplum={medplum}>{children}</MedplumProvider>,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(searchSpy).toHaveBeenCalledWith("Communication", {
      "part-of:missing": true,
      subject: undefined,
      _revinclude: "Communication:part-of",
      _sort: "-sent",
      _count: "100",
    });
  });

  test("Creates new thread successfully", async () => {
    const medplum = await setup();
    const createSpy = jest.spyOn(medplum, "createResource");

    const { result } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => <MedplumProvider medplum={medplum}>{children}</MedplumProvider>,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
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
    const medplum = await setup(mockPractitioner);

    const { result } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => <MedplumProvider medplum={medplum}>{children}</MedplumProvider>,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(result.current.createThread("New Thread")).rejects.toThrow(
      "Only patients can create threads",
    );
  });

  test("Does not create thread with empty topic", async () => {
    const medplum = await setup();
    const createSpy = jest.spyOn(medplum, "createResource");

    const { result } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => <MedplumProvider medplum={medplum}>{children}</MedplumProvider>,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const threadId = await result.current.createThread("   ");
    expect(threadId).toBeUndefined();
    expect(createSpy).not.toHaveBeenCalled();
  });

  test("Orders threads correctly by last activity", async () => {
    const medplum = new MockClient({ profile: mockPatient });
    const searchSpy = jest.spyOn(medplum, "search");

    // Create threads with different timestamps
    const thread1 = {
      resourceType: "Communication",
      id: "thread-1",
      status: "completed",
      sent: "2024-01-01T12:00:00Z",
      payload: [{ contentString: "Thread 1" }],
    } as Communication;

    const thread1Message = {
      resourceType: "Communication",
      id: "msg-1",
      status: "completed",
      sent: "2024-01-01T14:00:00Z", // Last activity for thread 1
      sender: createReference(mockPatient),
      payload: [{ contentString: "Message in thread 1" }],
      partOf: [{ reference: "Communication/thread-1" }],
    } as Communication;

    const thread2 = {
      resourceType: "Communication",
      id: "thread-2",
      status: "completed",
      sent: "2024-01-01T13:00:00Z", // Last activity for thread 2 (no messages)
      payload: [{ contentString: "Thread 2" }],
    } as Communication;

    const thread3 = {
      resourceType: "Communication",
      id: "thread-3",
      status: "completed",
      sent: "2024-01-01T12:00:00Z",
      payload: [{ contentString: "Thread 3" }],
    } as Communication;

    const thread3Message = {
      resourceType: "Communication",
      id: "msg-3",
      status: "completed",
      sent: "2024-01-01T15:00:00Z", // Last activity for thread 3
      sender: createReference(mockPatient),
      payload: [{ contentString: "Message in thread 3" }],
      partOf: [{ reference: "Communication/thread-3" }],
    } as Communication;

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
      wrapper: ({ children }) => <MedplumProvider medplum={medplum}>{children}</MedplumProvider>,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
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
        lastMessageTime: formatTime(new Date(thread3Message.sent!)),
      }),
    );

    expect(result.current.threads[1]).toEqual(
      expect.objectContaining({
        id: "thread-1",
        topic: "Thread 1",
        lastMessage: "Message in thread 1",
        lastMessageTime: formatTime(new Date(thread1Message.sent!)),
      }),
    );

    expect(result.current.threads[2]).toEqual(
      expect.objectContaining({
        id: "thread-2",
        topic: "Thread 2",
        lastMessage: undefined,
        lastMessageTime: undefined,
      }),
    );
  });
});
