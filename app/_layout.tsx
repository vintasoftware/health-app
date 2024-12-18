import { MedplumClient } from "@medplum/core";
import {
  ExpoClientStorage,
  initWebSocketManager,
  polyfillMedplumWebAPIs,
} from "@medplum/expo-polyfills";
import { MedplumProvider } from "@medplum/react-hooks";
import { ErrorBoundaryProps, router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

export function ErrorBoundary({ error, _retry }: ErrorBoundaryProps) {
  console.log(error);
  return null;
}

polyfillMedplumWebAPIs();
const medplum = new MedplumClient({
  clientId: process.env.EXPO_PUBLIC_MEDPLUM_CLIENT_ID,
  storage: new ExpoClientStorage(),
  onUnauthenticated: () => {
    medplum.clear();
    router.replace("/sign-in");
  },
});
initWebSocketManager(medplum);

export default function RootLayout() {
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
