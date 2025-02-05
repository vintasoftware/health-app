import { useMedplumContext } from "@medplum/react-hooks";
import { Redirect, Slot } from "expo-router";
import { useEffect } from "react";

import { LoadingScreen } from "@/components/LoadingScreen";
import { PractitionerBanner } from "@/components/PractitionerBanner";
import { ChatProvider } from "@/contexts/ChatContext";
import { useNotifications } from "@/contexts/NotificationsContext";

export default function AppLayout() {
  const { medplum, profile } = useMedplumContext();
  const { setUpPushNotifications } = useNotifications();
  const isPractitioner = profile?.resourceType === "Practitioner";

  useEffect(() => {
    if (profile && medplum.getActiveLogin()) {
      // Set up push notifications when user is logged in
      setUpPushNotifications();
    }
  }, [medplum, profile, setUpPushNotifications]);

  if (medplum.isLoading()) {
    return <LoadingScreen />;
  }
  if (!medplum.getActiveLogin()) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <ChatProvider>
      {isPractitioner && <PractitionerBanner />}
      <Slot />
    </ChatProvider>
  );
}
