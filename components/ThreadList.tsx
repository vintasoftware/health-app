import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Avatar, Divider, List, Text, useTheme } from "react-native-paper";
import Animated, { FadeInDown } from "react-native-reanimated";

import type { Thread } from "@/types/chat";

interface ThreadListProps {
  threads: Thread[];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  threadItem: {
    paddingHorizontal: 16,
  },
});

export function ThreadList({ threads }: ThreadListProps) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <GestureHandlerRootView style={styles.container}>
      <List.Section style={styles.container}>
        {threads.map((thread, index) => (
          <Animated.View key={thread.id} entering={FadeInDown.delay(index * 100)}>
            <List.Item
              title={thread.topic}
              description={thread.lastMessage}
              descriptionNumberOfLines={1}
              onPress={() => router.push(`/thread/${thread.id}`)}
              style={styles.threadItem}
              left={() => (
                <Avatar.Icon
                  size={40}
                  icon="doctor"
                  style={{ backgroundColor: theme.colors.primaryContainer }}
                />
              )}
              right={() => (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {thread.lastMessageTime}
                </Text>
              )}
            />
            <Divider />
          </Animated.View>
        ))}
      </List.Section>
    </GestureHandlerRootView>
  );
}
