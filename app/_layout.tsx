import { MedplumProvider } from "@medplum/react-hooks";
import { ErrorBoundaryProps, Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider, useTheme } from "react-native-paper";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { initMedplumClient } from "@/utils/medplum";

function StatusBarSpacing() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return <View style={{ height: insets.top, backgroundColor: theme.colors.background }} />;
}

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
      <PaperProvider>
        <MedplumProvider medplum={medplum}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar />
            <StatusBarSpacing />
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
