import "@/global.css";

import { MedplumClient } from "@medplum/core";
import {
  ExpoClientStorage,
  initWebSocketManager,
  polyfillMedplumWebAPIs,
} from "@medplum/expo-polyfills";
import { MedplumProvider } from "@medplum/react-hooks";
import { makeRedirectUri } from "expo-auth-session";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { oauth2ClientId } from "@/utils/medplum-oauth2";

export const unstable_settings = {
  initialRouteName: "/(app)",
};

SplashScreen.preventAutoHideAsync();

polyfillMedplumWebAPIs();
const medplum = new MedplumClient({
  clientId: oauth2ClientId,
  storage: new ExpoClientStorage(),
  onUnauthenticated: () => {
    router.replace("/sign-in");
  },
});
initWebSocketManager(medplum);

export default function RootLayout() {
  useEffect(() => {
    // Prevents flickering:
    requestAnimationFrame(SplashScreen.hideAsync);
  }, []);

  useEffect(() => {
    // Print redirect URL on startup
    if (__DEV__) {
      console.log("Redirect URL:", makeRedirectUri());
    }
  }, []);

  return (
    <>
      <StatusBar style="dark" translucent={true} />
      <GluestackUIProvider mode="light">
        <SafeAreaProvider>
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
        </SafeAreaProvider>
      </GluestackUIProvider>
    </>
  );
}
