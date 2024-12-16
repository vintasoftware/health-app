import { MedplumClient } from "@medplum/core";
import { Communication, Patient } from "@medplum/fhirtypes";
import { MockClient } from "@medplum/mock";
import { MedplumProvider } from "@medplum/react-hooks";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useChatMessages } from "@/hooks/headless/useChatMessages";

const mockPatient: Patient = {
  resourceType: "Patient",
  id: "test-patient",
  name: [{ given: ["John"], family: "Doe" }],
};

const mockThread: Communication = {
  resourceType: "Communication",
  id: "test-thread",
  status: "completed",
  sent: "2024-01-01T12:00:00Z",
};

const mockMessage1: Communication = {
  resourceType: "Communication",
  id: "msg-1",
  status: "completed",
  sent: "2024-01-01T12:01:00Z",
  sender: {
    reference: "Patient/test-patient",
    display: "John Doe",
  },
  payload: [{ contentString: "Hello" }],
  partOf: [{ reference: "Communication/test-thread" }],
};

const mockMessage2: Communication = {
  resourceType: "Communication",
  id: "msg-2",
  status: "completed",
  sent: "2024-01-01T12:02:00Z",
  sender: {
    reference: "Practitioner/test-doctor",
    display: "Dr. Smith",
  },
  payload: [{ contentString: "Hi there" }],
  partOf: [{ reference: "Communication/test-thread" }],
};

describe("useChatMessages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function setup(): Promise<MedplumClient> {
    const medplum = new MockClient({ profile: mockPatient });

    // Setup mock data
    await medplum.createResource(mockPatient);
    await medplum.createResource(mockThread);
    await medplum.createResource(mockMessage1);
    await medplum.createResource(mockMessage2);

    return medplum as unknown as MedplumClient;
  }

  test("Loads and displays messages", async () => {
    const medplum = await setup();
    const searchSpy = jest.spyOn(medplum, "search");

    const { result } = renderHook(() => useChatMessages("test-thread"), {
      wrapper: ({ children }) => <MedplumProvider medplum={medplum}>{children}</MedplumProvider>,
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.messages).toHaveLength(2);
    });

    // Verify search was called correctly
    expect(searchSpy).toHaveBeenCalledWith("Communication", {
      "part-of": "Communication/test-thread",
      _sort: "-sent",
      _count: "100",
    });

    // Check messages are displayed
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].text).toBe("Hello");
    expect(result.current.messages[0].sender).toBe("patient");
    expect(result.current.messages[1].text).toBe("Hi there");
    expect(result.current.messages[1].sender).toBe("doctor");
  });

  test("Sends new message", async () => {
    const medplum = await setup();
    const createSpy = jest.spyOn(medplum, "createResource");

    const { result } = renderHook(() => useChatMessages("test-thread"), {
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
      expect(result.current.messages).toHaveLength(3);
    });

    // Verify the new message appears in the list
    expect(result.current.messages[2].text).toBe("New message");
    expect(result.current.messages[2].sender).toBe("patient");
  });

  test("Does not send empty message", async () => {
    const medplum = await setup();
    const createSpy = jest.spyOn(medplum, "createResource");

    const { result } = renderHook(() => useChatMessages("test-thread"), {
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
});