import { Practitioner, Reference } from "@medplum/fhirtypes";
import { Patient } from "@medplum/fhirtypes";
import { useMedplumContext } from "@medplum/react-hooks";
import { useRouter } from "expo-router";
import { PlusIcon, UserRound } from "lucide-react-native";
import { useCallback } from "react";
import { FlatList, ListRenderItem } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Box } from "@/components/ui/box";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";
import type { Thread } from "@/models/chat";
import { formatTime } from "@/utils/datetime";

interface ThreadListProps {
  threads: Thread[];
  getAvatarURL: (
    reference: Reference<Patient | Practitioner> | undefined,
  ) => string | null | undefined;
  onCreateThread?: () => void;
}

function ThreadItem({
  thread,
  index,
  onPress,
  avatarURL,
  isPractitioner,
}: {
  thread: Thread;
  index: number;
  onPress: () => void;
  avatarURL: string | undefined;
  isPractitioner: boolean;
}) {
  const { profile } = useMedplumContext();

  return (
    <View>
      <Pressable
        onPress={() => onPress()}
        className="overflow-hidden bg-background-0 active:bg-secondary-100"
      >
        <View className="flex-row items-center gap-3 p-4">
          <Avatar size="md" className="border-2 border-primary-200">
            <Icon as={UserRound} size="lg" className="stroke-typography-0" />
            <AvatarImage source={{ uri: avatarURL }} />
          </Avatar>

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-semibold text-typography-900" isTruncated={true}>
                {isPractitioner ? `${thread.patientName}: ${thread.topic}` : thread.topic}
              </Text>
              {profile && thread.getUnreadCount({ profile }) > 0 && (
                <View className="rounded-full bg-primary-500 px-2 py-0.5">
                  <Text className="text-xs font-medium text-typography-0">
                    {thread.getUnreadCount({ profile })}
                  </Text>
                </View>
              )}
            </View>
            <Text className="mt-0.5 text-sm text-typography-600" isTruncated={true}>
              {thread.lastMessage}
            </Text>
          </View>

          <Text className="mt-1 self-start text-xs text-typography-500">
            {thread.lastMessageSentAt ? formatTime(thread.lastMessageSentAt) : ""}
          </Text>
        </View>
      </Pressable>
      <View className="h-[1px] bg-outline-100" />
    </View>
  );
}

function EmptyState({ onCreateThread }: { onCreateThread?: () => void }) {
  const { profile } = useMedplumContext();
  const isPatient = profile?.resourceType === "Patient";

  return (
    <View className="flex-1 items-center justify-center p-4">
      <View className="items-center rounded-2xl border border-secondary-300 bg-secondary-200 p-8">
        <Text className="text-center text-lg text-typography-900">
          No chat threads yet. {isPatient && "Start a new conversation!"}
        </Text>
        {isPatient && onCreateThread && (
          <Button
            className="mt-4"
            variant="solid"
            action="primary"
            size="md"
            onPress={() => onCreateThread()}
          >
            <ButtonIcon as={PlusIcon} size="sm" />
            <ButtonText>New Thread</ButtonText>
          </Button>
        )}
      </View>
    </View>
  );
}

export function ThreadList({ threads, getAvatarURL, onCreateThread }: ThreadListProps) {
  const router = useRouter();
  const { profile } = useMedplumContext();
  const isPractitioner = profile?.resourceType === "Practitioner";

  const renderItem: ListRenderItem<Thread> = useCallback(
    ({ item: thread, index }) => (
      <ThreadItem
        thread={thread}
        index={index}
        onPress={() => router.push(`/thread/${thread.id}`)}
        avatarURL={getAvatarURL(thread.getAvatarRef({ profile })) ?? undefined}
        isPractitioner={isPractitioner}
      />
    ),
    [getAvatarURL, profile, isPractitioner, router],
  );

  if (threads.length === 0) {
    return (
      <GestureHandlerRootView className="flex-1">
        <Box className="flex-1 bg-background-50">
          <EmptyState onCreateThread={onCreateThread} />
        </Box>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <Box className="flex-1 bg-background-50">
        <FlatList
          data={threads}
          renderItem={renderItem}
          keyExtractor={(thread) => thread.id}
          showsVerticalScrollIndicator={true}
          initialNumToRender={20}
          windowSize={5}
          removeClippedSubviews
        />
      </Box>
    </GestureHandlerRootView>
  );
}
