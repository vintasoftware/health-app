import { Text } from "react-native";
import { Redirect, Slot } from "expo-router";
import { useMedplum } from "@medplum/react-hooks";

export default function AppLayout() {
  const medplum = useMedplum();

  if (!medplum || medplum.isLoading()) {
    return <Text>Loading...</Text>;
  }
  if (!medplum.getActiveLogin()) {
    return <Redirect href="/sign-in" withAnchor={true} />;
  }
  return <Slot />;
}
