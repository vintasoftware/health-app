import { ActivityIndicator, Text, View } from "react-native";
import { useMedplum } from "@medplum/react-hooks";

export default function Index() {
  const medplum = useMedplum();
  const profile = medplum.getProfile();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {!profile && <ActivityIndicator />}
      {profile && (
        <Text>
          Hello {profile.name?.[0]?.given?.[0]} {profile.name?.[0]?.family}
        </Text>
      )}
    </View>
  );
}
