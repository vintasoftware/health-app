import { useMedplum } from "@medplum/react-hooks";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { StyleSheet } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThreadHeader } from "@/components/ThreadHeader";
import { ThreadList } from "@/components/ThreadList";
import { useThreads } from "@/hooks/headless/useThreads";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function Index() {
  const { threads, loading } = useThreads();
  const medplum = useMedplum();
  const router = useRouter();

  const handleLogout = useCallback(() => {
    medplum.clear();
    router.replace("/sign-in");
  }, [medplum, router]);

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ThreadHeader onLogout={handleLogout} />
      <ThreadList threads={threads} />
    </SafeAreaView>
  );
}
