import { MedplumClient } from "@medplum/core";
import { MedplumProvider } from "@medplum/react-hooks";
import { Stack } from "expo-router";

const medplum = new MedplumClient({
  clientId: process.env.EXPO_PUBLIC_MEDPLUM_CLIENT_ID,
});

export default function RootLayout() {
  return (
    <MedplumProvider medplum={medplum}>
      <Stack />
    </MedplumProvider>
  );
}
