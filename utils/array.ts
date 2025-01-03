export const upsertObjectArray = <T extends { id?: string }>(arr: T[], obj: T): T[] => {
  const existingIndex = arr.findIndex((t) => t.id != null && obj.id != null && t.id === obj.id);
  if (existingIndex !== -1) {
    return [...arr.slice(0, existingIndex), obj, ...arr.slice(existingIndex + 1)];
  }
  return [...arr, obj];
};
