import { MedplumProvider } from "@medplum/react-hooks";
import { ErrorBoundaryProps, Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { initMedplumClient } from "@/utils/medplum";

export function ErrorBoundary({ error, _retry }: ErrorBoundaryProps) {
  console.log(error);
  return null;
}

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
    <SafeAreaProvider>
      <StatusBar translucent={true} />
      <PaperProvider>
        <MedplumProvider medplum={medplum}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerShown: false,
              }}
            />
          </GestureHandlerRootView>
        </MedplumProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
