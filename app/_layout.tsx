import { MedplumClient } from "@medplum/core";
import {
  ExpoClientStorage,
  initWebSocketManager,
  polyfillMedplumWebAPIs,
} from "@medplum/expo-polyfills";
import { MedplumProvider } from "@medplum/react-hooks";
import { ErrorBoundaryProps, router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { oauth2ClientId } from "@/utils/medplum-oauth2";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(app)/index",
};

export function ErrorBoundary({ error, _retry }: ErrorBoundaryProps) {
  console.log(error);
  return null;
}

polyfillMedplumWebAPIs();
const medplum = new MedplumClient({
  clientId: oauth2ClientId,
  storage: new ExpoClientStorage(),
  onUnauthenticated: () => {
    medplum.clear();
    router.replace("/sign-in");
  },
});
initWebSocketManager(medplum);

export default function RootLayout() {
  useEffect(() => {
    // Prevents flickering:
    requestAnimationFrame(SplashScreen.hideAsync);
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar translucent={true} />
      <PaperProvider theme={MD3LightTheme}>
        <MedplumProvider medplum={medplum}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerShown: false,
                // Prevents flickering:
                animation: "none",
              }}
            />
          </GestureHandlerRootView>
        </MedplumProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
