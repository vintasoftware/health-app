import { useMedplumContext } from "@medplum/react-hooks";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { CreateThreadModal } from "@/components/CreateThreadModal";
import { ThreadList } from "@/components/ThreadList";
import { ThreadListHeader } from "@/components/ThreadListHeader";
import { Spinner } from "@/components/ui/spinner";
import { useAvatars } from "@/hooks/useAvatars";
import { useThreads } from "@/hooks/useThreads";

export default function Index() {
  const { medplum, profile } = useMedplumContext();
  const { threads, isLoading, createThread } = useThreads();
  const router = useRouter();
  const avatarReferences = useMemo(
    () => threads.map((thread) => thread.getAvatarRef({ profile })),
    [threads, profile],
  );
  const { getAvatarURL, isLoading: isAvatarsLoading } = useAvatars(avatarReferences);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleLogout = useCallback(() => {
    medplum.signOut();
    router.replace("/sign-in");
  }, [medplum, router]);

  if (isLoading || isAvatarsLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <Spinner size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <ThreadListHeader onLogout={handleLogout} onCreateThread={() => setIsCreateModalOpen(true)} />
      <ThreadList
        threads={threads}
        getAvatarURL={getAvatarURL}
        onCreateThread={() => setIsCreateModalOpen(true)}
      />
      <CreateThreadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateThread={createThread}
      />
    </SafeAreaView>
  );
}
