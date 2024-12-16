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
