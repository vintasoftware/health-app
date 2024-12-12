import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { List, Surface, Text } from "react-native-paper";

import type { Thread } from "@/types/chat";

interface ThreadListProps {
  threads: Thread[];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  threadItem: {
    marginBottom: 8,
    borderRadius: 8,
  },
});

export function ThreadList({ threads }: ThreadListProps) {
  const router = useRouter();

  return (
    <List.Section style={styles.container}>
      {threads.map((thread) => (
        <Surface key={thread.id} style={styles.threadItem}>
          <List.Item
            title={thread.topic}
            description={thread.lastMessage}
            descriptionNumberOfLines={1}
            onPress={() => router.push(`/thread/${thread.id}`)}
            right={() => <Text variant="bodySmall">{thread.lastMessageTime}</Text>}
          />
        </Surface>
      ))}
    </List.Section>
  );
}
