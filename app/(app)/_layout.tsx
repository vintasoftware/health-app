import { useMedplum } from "@medplum/react-hooks";
import { Redirect, Slot } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { PractitionerBanner } from "@/components/PractitionerBanner";
import { Spinner } from "@/components/ui/spinner";
import { ChatProvider } from "@/contexts/ChatContext";

export default function AppLayout() {
  const medplum = useMedplum();
  const isPractitioner = medplum.getProfile()?.resourceType === "Practitioner";

  if (medplum.isLoading()) {
    return (
      <SafeAreaView
        className="bg-background-50"
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Spinner size="large" />
      </SafeAreaView>
    );
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
