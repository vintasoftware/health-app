import { getReferenceString, MedplumClient } from "@medplum/core";
import { Patient, Practitioner, Reference } from "@medplum/fhirtypes";
import { useMedplum } from "@medplum/react-hooks";
import { useCallback, useEffect, useState } from "react";

const avatarMap = new Map<string, string | null>();

async function fetchAvatars({
  references,
  medplum,
}: {
  references: Reference<Patient | Practitioner>[];
  medplum: MedplumClient;
}) {
  return await Promise.all(
    references.map(async (reference) => {
      const key = getReferenceString(reference);
      if (avatarMap.has(key)) {
        return avatarMap.get(key);
      }

      try {
        const profile = await medplum.readReference(reference);
        const avatarURL = profile.photo?.[0]?.url || null;
        avatarMap.set(key, avatarURL);
        return avatarURL;
      } catch {
        // Ignore readResource errors
        return null;
      }
    }),
  );
}

function getAvatarURL(reference: Reference<Patient | Practitioner> | undefined) {
  if (!reference) {
    return undefined;
  }
  return avatarMap.get(getReferenceString(reference));
}

export function useAvatars(references: (Reference<Patient | Practitioner> | undefined)[]): {
  getAvatarURL: (
    reference: Reference<Patient | Practitioner> | undefined,
  ) => string | null | undefined;
  isLoading: boolean;
} {
  const medplum = useMedplum();
  const [isLoading, setIsLoading] = useState(false);

  const fetchMissingAvatars = useCallback(async () => {
    if (references.every((ref) => !ref || avatarMap.has(getReferenceString(ref)))) {
      return;
    }
    setIsLoading(true);
    try {
      await fetchAvatars({ references: references.filter((ref) => !!ref), medplum });
    } finally {
      setIsLoading(false);
    }
  }, [references, medplum]);

  // Fetch missing avatars when references change
  useEffect(() => {
    fetchMissingAvatars();
  }, [fetchMissingAvatars]);

  return { getAvatarURL, isLoading };
}
