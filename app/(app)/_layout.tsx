import { useMedplumContext } from "@medplum/react-hooks";
import { Redirect, Slot } from "expo-router";
import { View } from "react-native";

import { PractitionerBanner } from "@/components/PractitionerBanner";
import { Spinner } from "@/components/ui/spinner";
import { ChatProvider } from "@/contexts/ChatContext";

export default function AppLayout() {
  const { medplum, profile } = useMedplumContext();
  const isPractitioner = profile?.resourceType === "Practitioner";

  if (medplum.isLoading()) {
    return (
      <View className="flex-1 items-center justify-center bg-background-50">
        <Spinner size="large" />
      </View>
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
