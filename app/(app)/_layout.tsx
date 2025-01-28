import { useMedplumContext } from "@medplum/react-hooks";
import { Redirect, Slot } from "expo-router";

import { LoadingScreen } from "@/components/LoadingScreen";
import { PractitionerBanner } from "@/components/PractitionerBanner";
import { ChatProvider } from "@/contexts/ChatContext";

export default function AppLayout() {
  const { medplum, profile } = useMedplumContext();
  const isPractitioner = profile?.resourceType === "Practitioner";

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
