import "@/global.css";
import "expo-dev-client";

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
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { GluestackUIProvider } from "@/components/gluestack-ui-provider";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { oauth2ClientId } from "@/utils/medplum-oauth2";

export const unstable_settings = {
  initialRouteName: "/(app)",
};

SplashScreen.preventAutoHideAsync();

polyfillMedplumWebAPIs({ location: false });
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
    <SafeAreaView className="h-full bg-background-50 md:w-full">
      <GluestackUIProvider mode="system">
        <MedplumProvider medplum={medplum}>
          <GestureHandlerRootView className="flex-1">
            <Stack
              screenOptions={{
                headerShown: false,
                // Prevents flickering:
                animation: "none",
              }}
            />
          </GestureHandlerRootView>
        </MedplumProvider>
      </GluestackUIProvider>
    </SafeAreaView>
  );
}
