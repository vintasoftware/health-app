import { Slot, useRouter } from "expo-router";
import { MedplumProvider } from "@medplum/react-hooks";
import { initMedplumClient } from "@/utils/medplum";
import { useMemo } from "react";

export default function RootLayout() {
  const router = useRouter();
  const medplum = useMemo(
    () =>
      initMedplumClient({
        onUnauthenticated: () => {
          medplum.clear();
          router.navigate("/sign-in");
        },
      }),
    [router],
  );

  return (
    <MedplumProvider medplum={medplum}>
      <Slot />
    </MedplumProvider>
  );
}
