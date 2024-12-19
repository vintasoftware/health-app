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
      <ThreadHeader />
      <ThreadList threads={threads} />
    </SafeAreaView>
  );
}
