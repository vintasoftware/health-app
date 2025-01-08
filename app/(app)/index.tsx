import { useMedplum } from "@medplum/react-hooks";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { CreateThreadModal } from "@/components/CreateThreadModal";
import { ThreadList } from "@/components/ThreadList";
import { ThreadListHeader } from "@/components/ThreadListHeader";
import { Spinner } from "@/components/ui/spinner";
import { useChat } from "@/contexts/ChatContext";

export default function Index() {
  const { threads, isLoadingThreads, createThread } = useChat();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const medplum = useMedplum();
  const router = useRouter();

  const handleLogout = useCallback(() => {
    medplum.signOut();
    router.replace("/sign-in");
  }, [medplum, router]);

  // When threads are loaded, fetch their image URLs
  useEffect(() => {
    if (!isLoadingThreads) {
      threads.forEach((thread) => {
        thread.loadImageURL({ medplum });
      });
    }
  }, [isLoadingThreads, threads, medplum]);

  if (isLoadingThreads) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <Spinner size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <ThreadListHeader onLogout={handleLogout} onCreateThread={() => setIsCreateModalOpen(true)} />
      <ThreadList threads={threads} onCreateThread={() => setIsCreateModalOpen(true)} />
      <CreateThreadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateThread={createThread}
      />
    </SafeAreaView>
  );
}
