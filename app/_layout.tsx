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
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";

import { GluestackUIProvider } from "@/components/gluestack-ui-provider";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
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

  const { colorScheme } = useColorScheme();
  return (
    <GluestackUIProvider mode={colorScheme}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar />
        <SafeAreaView className="h-full bg-background-0 md:w-full">
          <MedplumProvider medplum={medplum}>
            <NotificationsProvider>
              <GestureHandlerRootView className="flex-1">
                <Stack
                  screenOptions={{
                    headerShown: false,
                    // Prevents flickering:
                    animation: "none",
                  }}
                />
              </GestureHandlerRootView>
            </NotificationsProvider>
          </MedplumProvider>
        </SafeAreaView>
      </SafeAreaProvider>
    </GluestackUIProvider>
  );
}
