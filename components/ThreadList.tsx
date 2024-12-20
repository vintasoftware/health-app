import { useRouter } from "expo-router";
import { FlatList } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Avatar } from "@/components/ui/avatar";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";
import type { Thread } from "@/types/chat";

interface ThreadListProps {
  threads: Thread[];
}

function ThreadItem({
  thread,
  index,
  onPress,
}: {
  thread: Thread;
  index: number;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <Pressable onPress={onPress} className="bg-transparent active:bg-secondary-600">
        <View className="flex-row items-center p-4 gap-3">
          <Avatar size="md">
            <Text>{thread.topic.slice(0, 2).toUpperCase()}</Text>
          </Avatar>

          <View className="flex-1">
            <Text className="text-base font-medium text-typography-900">{thread.topic}</Text>
            <Text className="text-sm text-typography-600" numberOfLines={1}>
              {thread.lastMessage}
            </Text>
          </View>

          <Text className="text-xs text-typography-500">{thread.lastMessageTime}</Text>
        </View>
      </Pressable>
      <View className="h-[1px] bg-outline-200" />
    </Animated.View>
  );
}

export function ThreadList({ threads }: ThreadListProps) {
  const router = useRouter();

  return (
    <GestureHandlerRootView className="flex-1">
      <Box className="flex-1">
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ThreadItem
              thread={item}
              index={index}
              onPress={() => router.push(`/thread/${item.id}`)}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
        />
      </Box>
    </GestureHandlerRootView>
  );
}
