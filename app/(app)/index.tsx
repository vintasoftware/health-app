import { useMedplum } from "@medplum/react-hooks";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThreadHeader } from "@/components/ThreadHeader";
import { ThreadList } from "@/components/ThreadList";
import { Spinner } from "@/components/ui/spinner";
import { useThreads } from "@/hooks/headless/useThreads";

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
        <Spinner size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-background-50" style={{ flex: 1 }}>
      <ThreadHeader onLogout={handleLogout} />
      <ThreadList threads={threads} />
    </SafeAreaView>
  );
}
