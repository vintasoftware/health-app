import { ActivityIndicator, SafeAreaView, StyleSheet } from "react-native";
import { useThreads } from "@/hooks/headless/useThreads";
import { ThreadList } from "@/components/ThreadList";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function Index() {
  const { threads, loading } = useThreads();

  if (loading) return <ActivityIndicator />;

  return (
    <SafeAreaView style={styles.container}>
      <ThreadList threads={threads} />
    </SafeAreaView>
  );
}
