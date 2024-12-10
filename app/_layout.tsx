import { ErrorBoundaryProps, Stack, useRouter } from "expo-router";
import { MedplumProvider } from "@medplum/react-hooks";
import { initMedplumClient } from "@/utils/medplum";
import { useMemo } from "react";
import { PaperProvider, useTheme } from "react-native-paper";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { View } from "react-native";

function StatusBarSpacing() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return <View style={{ height: insets.top, backgroundColor: theme.colors.background }} />;
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
