import { MedplumClient } from "@medplum/core";
import { useMedplumContext } from "@medplum/react-hooks";
import { Redirect, router, Stack } from "expo-router";
import { useEffect } from "react";

import { LoadingScreen } from "@/components/LoadingScreen";
import { PractitionerBanner } from "@/components/PractitionerBanner";
import { ChatProvider } from "@/contexts/ChatContext";
import { useNotifications } from "@/contexts/NotificationsContext";

async function retryMedplumProfile(medplum: MedplumClient) {
  // If profile is already loaded, do nothing:
  if (!medplum.isLoading()) {
    return;
  }
  // If Medplum is not initialized, check again later:
  if (!medplum.isInitialized) {
    setTimeout(() => retryMedplumProfile(medplum), 1000);
    return;
  }

  // The only way to check if profile fetch failed is to await for getProfileAsync
  try {
    await medplum.getProfileAsync();
  } catch {
    // If profile fetch failed, force profile reload by calling setActiveLogin,
    // as it's the only way to clean up the internal profilePromise,
    // otherwise MedplumClient stays stuck in loading state
    const activeLogin = medplum.getActiveLogin();
    if (activeLogin) {
      medplum.setActiveLogin(activeLogin);
      // Ensure profile fetch after 1 second:
      setTimeout(() => retryMedplumProfile(medplum), 1000);
    } else {
      // If there's no active login, redirect to sign-in:
      medplum.clearActiveLogin();
      router.replace("/sign-in");
    }
  }
}

export default function AppLayout() {
  const { medplum, profile } = useMedplumContext();
  const { setUpPushNotifications } = useNotifications();
  const isPractitioner = profile?.resourceType === "Practitioner";

  // Ensure profile is loaded or loading,
  // to avoid app getting stuck in medplum.isLoading() state
  // when an error occurs in the internal profilePromise (due to server or network issues)
  // See: https://github.com/medplum/medplum/issues/5933
  useEffect(() => {
    retryMedplumProfile(medplum);
  }, [medplum]);

  // Set up push notifications when user is logged in
  useEffect(() => {
    if (profile) {
      setUpPushNotifications();
    }
  }, [profile, setUpPushNotifications]);

  if (medplum.isLoading()) {
    return <LoadingScreen />;
  }
  if (!medplum.getActiveLogin()) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <ChatProvider>
      {isPractitioner && <PractitionerBanner />}
      <Stack
        screenOptions={{
          headerShown: false,
          // Prevents flickering:
          animation: "none",
        }}
      />
    </ChatProvider>
  );
}
