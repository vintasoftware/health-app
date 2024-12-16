import { createReference } from "@medplum/core";
import { Communication, Patient } from "@medplum/fhirtypes";
import { MockClient } from "@medplum/mock";
import { MedplumProvider } from "@medplum/react-hooks";
import { renderHook, waitFor } from "@testing-library/react-native";

import { useThreads } from "@/hooks/headless/useThreads";
import { formatTimestamp } from "@/utils/datetime";

const mockPatient: Patient = {
  resourceType: "Patient",
  id: "test-patient",
  name: [{ given: ["John"], family: "Doe" }],
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
  async function setup(): Promise<MockClient> {
    const medplum = new MockClient({ profile: mockPatient });

    // Setup mock data
    await medplum.createResource(mockPatient);
    await medplum.createResource(mockThread1);
    await medplum.createResource(mockMessage1);
    await medplum.createResource(mockThread2);

    return medplum;
  }

  test("Loads and displays threads", async () => {
    const medplum = await setup();
    const searchSpy = jest.spyOn(medplum, "search");

    // Mock the search implementation to return results with search modes
    // (the mock client doesn't support search modes)
    searchSpy.mockResolvedValue({
      resourceType: "Bundle",
      type: "searchset",
      entry: [
        {
          fullUrl: `https://api.medplum.com/fhir/R4/Communication/${mockThread1.id}`,
          search: { mode: "match" },
          resource: mockThread1,
        },
        {
          fullUrl: `https://api.medplum.com/fhir/R4/Communication/${mockMessage1.id}`,
          search: { mode: "include" },
          resource: mockMessage1,
        },
        {
          fullUrl: `https://api.medplum.com/fhir/R4/Communication/${mockMessage1.id}`,
          search: { mode: "include" },
          resource: mockMessage2,
        },
        {
          fullUrl: `https://api.medplum.com/fhir/R4/Communication/${mockThread2.id}`,
          search: { mode: "match" },
          resource: mockThread2,
        },
      ],
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

    // Initially should be loading
    expect(result.current.loading).toBe(true);

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify search was called correctly
    expect(searchSpy).toHaveBeenCalledWith("Communication", {
      "part-of:missing": true,
      _revinclude: "Communication:part-of",
      _sort: "-sent",
      _count: "100",
    });

    // Check threads are displayed correctly
    expect(result.current.threads).toHaveLength(2);
    expect(result.current.threads[0]).toEqual(
      expect.objectContaining({
        id: "test-thread-1",
        topic: "Thread 1 Topic",
        lastMessage: "Last message",
        lastMessageTime: formatTimestamp(new Date(mockMessage2.sent!)),
      }),
    );
    expect(result.current.threads[1]).toEqual(
      expect.objectContaining({
        id: "test-thread-2",
        topic: "Thread 2 Topic",
      }),
    );
  });

  test("Handles no threads", async () => {
    const medplum = new MockClient({ profile: mockPatient });

    // Mock empty search results
    medplum.search = jest.fn().mockResolvedValue({
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

    const searchSpy = jest.spyOn(medplum, "search");

    const { result } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => <MedplumProvider medplum={medplum}>{children}</MedplumProvider>,
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(searchSpy).toHaveBeenCalled();
    expect(result.current.threads).toEqual([]);
  });
});
