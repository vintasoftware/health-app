import { useMedplumContext } from "@medplum/react-hooks";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";

import { CreateThreadModal } from "@/components/CreateThreadModal";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThreadList } from "@/components/ThreadList";
import { ThreadListHeader } from "@/components/ThreadListHeader";
import { useAvatars } from "@/hooks/useAvatars";
import { useThreads } from "@/hooks/useThreads";
import { clearProfilePushToken } from "@/utils/notifications";

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

  const handleLogout = useCallback(async () => {
    await clearProfilePushToken(medplum);
    medplum.signOut();
    router.replace("/sign-in");
  }, [medplum, router]);

  if (isLoading || isAvatarsLoading) {
    return <LoadingScreen />;
  }

  return (
    <View className="flex-1 bg-background-50">
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
    </View>
  );
}
