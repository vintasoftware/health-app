import { indexSearchParameterBundle, indexStructureDefinitionBundle } from "@medplum/core";
import { readJson, SEARCH_PARAMETER_BUNDLE_FILES } from "@medplum/definitions";
import { Bundle, SearchParameter } from "@medplum/fhirtypes";

// Fix Medplum's MockClient search filters:
beforeAll(() => {
  indexStructureDefinitionBundle(readJson("fhir/r4/profiles-types.json") as Bundle);
  indexStructureDefinitionBundle(readJson("fhir/r4/profiles-resources.json") as Bundle);
  indexStructureDefinitionBundle(readJson("fhir/r4/profiles-medplum.json") as Bundle);
  for (const filename of SEARCH_PARAMETER_BUNDLE_FILES) {
    indexSearchParameterBundle(readJson(filename) as Bundle<SearchParameter>);
  }
});

beforeEach(() => {
  jest.clearAllMocks();
});

// Mock CloseEvent for testing, as react-native does not support it
// https://github.com/facebook/react-native/issues/23468
global.CloseEvent = class CloseEvent extends Event implements CloseEvent {
  public code: number;
  public reason: string;
  public wasClean = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(code = 1000, reason = "", target: any) {
    super("close", target);
    this.code = code;
    this.reason = reason;
  }
} as unknown as typeof globalThis.CloseEvent;
