import { useMedplumContext } from "@medplum/react-hooks";
import { Redirect, Slot } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Spinner } from "@/components/ui/spinner";

export default function AppLayout() {
  const { medplum, loading } = useMedplumContext();

  if (loading || !medplum.isInitialized) {
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

  return <Slot />;
}
