import { Resource } from "@medplum/fhirtypes";

/**
 * Syncs an array of resources by adding the new resource if it doesn't exist,
 * or replacing it if it does and has a newer lastUpdated date.
 * @param arr - The array of resources.
 * @param obj - The resource to sync.
 * @returns The updated array of resources.
 */
export const syncResourceArray = <T extends Resource>(arr: T[], obj: T): T[] => {
  const existingIndex = arr.findIndex((t) => t.id != null && obj.id != null && t.id === obj.id);
  if (existingIndex !== -1) {
    if (
      obj.meta?.lastUpdated != null &&
      arr[existingIndex].meta?.lastUpdated != null &&
      obj.meta?.lastUpdated > arr[existingIndex].meta?.lastUpdated
    ) {
      return [...arr.slice(0, existingIndex), obj, ...arr.slice(existingIndex + 1)];
    }
  }
  return [...arr, obj];
};
