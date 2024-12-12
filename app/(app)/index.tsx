import { SafeAreaView, StyleSheet } from "react-native";
import { ActivityIndicator } from "react-native-paper";

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
    <SafeAreaView style={styles.container}>
      <ThreadList threads={threads} />
    </SafeAreaView>
  );
}
