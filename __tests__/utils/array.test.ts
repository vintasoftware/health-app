import { Resource } from "@medplum/fhirtypes";

import { syncResourceArray } from "@/utils/array";

describe("syncResourceArray", () => {
  const buildTestResource = (id: string, lastUpdated?: string): Resource => ({
    resourceType: "Communication",
    id,
    status: "completed",
    meta: lastUpdated ? { lastUpdated } : undefined,
  });

  test("adds new resource to empty array", () => {
    const resource = buildTestResource("123");
    const result = syncResourceArray([], resource);
    expect(result).toEqual([resource]);
  });

  test("adds new resource to existing array", () => {
    const existing = buildTestResource("123");
    const newResource = buildTestResource("456");
    const result = syncResourceArray([existing], newResource);
    expect(result).toEqual([existing, newResource]);
  });

  test("adds new resource to existing array with multiple resources", () => {
    const existing = [buildTestResource("123"), buildTestResource("456")];
    const newResource = buildTestResource("789");
    const result = syncResourceArray(existing, newResource);
    expect(result).toEqual([existing[0], existing[1], newResource]);
  });

  test("updates existing resource with newer lastUpdated", () => {
    const existing = buildTestResource("123", "2024-01-01T00:00:00Z");
    const updated = buildTestResource("123", "2024-01-02T00:00:00Z");
    const result = syncResourceArray([existing], updated);
    expect(result).toEqual([updated]);
  });

  test("keeps existing resource if newer than update", () => {
    const existing = buildTestResource("123", "2024-01-02T00:00:00Z");
    const older = buildTestResource("123", "2024-01-01T00:00:00Z");
    const result = syncResourceArray([existing], older);
    expect(result).toEqual([existing]);
  });

  test("keeps existing resource if lastUpdated dates are equal", () => {
    const existing = buildTestResource("123", "2024-01-01T00:00:00Z");
    const same = buildTestResource("123", "2024-01-01T00:00:00Z");
    const result = syncResourceArray([existing], same);
    expect(result).toEqual([existing]);
  });

  test("keeps existing resource if update has no lastUpdated", () => {
    const existing = buildTestResource("123", "2024-01-01T00:00:00Z");
    const noDate = buildTestResource("123");
    const result = syncResourceArray([existing], noDate);
    expect(result).toEqual([existing]);
  });

  test("keeps existing resource if neither has lastUpdated", () => {
    const existing = buildTestResource("123");
    const noDate = buildTestResource("123");
    const result = syncResourceArray([existing], noDate);
    expect(result).toEqual([existing]);
  });

  test("handles resources with null ids", () => {
    const existing = buildTestResource("123");
    const noId = { resourceType: "Patient" } as Resource;
    const result = syncResourceArray([existing], noId);
    expect(result).toEqual([existing, noId]);
  });

  test("preserves array order when updating middle element", () => {
    const resources = [
      buildTestResource("1", "2024-01-01T00:00:00Z"),
      buildTestResource("2", "2024-01-01T00:00:00Z"),
      buildTestResource("3", "2024-01-01T00:00:00Z"),
    ];
    const updated = buildTestResource("2", "2024-01-02T00:00:00Z");
    const result = syncResourceArray(resources, updated);
    expect(result).toEqual([resources[0], updated, resources[2]]);
  });
});
