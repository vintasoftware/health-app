import { Slot, Stack, useRouter } from "expo-router";
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
          router.replace("/sign-in");
        },
      }),
    [router],
  );

  return (
    <MedplumProvider medplum={medplum}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </MedplumProvider>
  );
}
