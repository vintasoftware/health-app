import { useMedplum } from "@medplum/react-hooks";
import { Redirect, Slot } from "expo-router";
import { ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AppLayout() {
  const medplum = useMedplum();

  if (!medplum || medplum.isLoading()) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }
  if (!medplum.getActiveLogin()) {
    return <Redirect href="/sign-in" withAnchor={true} />;
  }
  return <Slot />;
}
