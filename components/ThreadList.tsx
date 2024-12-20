import { useRouter } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Box } from "@/components/ui/box";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";
import type { Thread } from "@/types/chat";

interface ThreadListProps {
  threads: Thread[];
}

export function ThreadList({ threads }: ThreadListProps) {
  const router = useRouter();

  return (
    <GestureHandlerRootView className="flex-1">
      <Box className="flex-1">
        {threads.map((thread, index) => (
          <Animated.View key={thread.id} entering={FadeInDown.delay(index * 100)}>
            <Pressable
              onPress={() => router.push(`/thread/${thread.id}`)}
              className="flex-row items-center p-4 gap-3"
            >
              <View className="h-10 w-10 rounded-full bg-primary-100 items-center justify-center">
                <Icon name="doctor" size="md" className="text-primary-600" />
              </View>

              <View className="flex-1">
                <Text className="text-base font-medium text-typography-900">{thread.topic}</Text>
                <Text className="text-sm text-typography-600" numberOfLines={1}>
                  {thread.lastMessage}
                </Text>
              </View>

              <Text className="text-xs text-typography-500">{thread.lastMessageTime}</Text>
            </Pressable>
            <View className="h-[1px] bg-outline-200" />
          </Animated.View>
        ))}
      </Box>
    </GestureHandlerRootView>
  );
}
