import { View, StyleSheet, Pressable } from "react-native";
import { Surface, Text } from "react-native-paper";
import { useRouter } from "expo-router";
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
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    opacity: 0.7,
  },
  time: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 4,
  },
});

export function ThreadList({ threads }: ThreadListProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {threads.map((thread) => (
        <Pressable key={thread.id} onPress={() => router.push(`/thread/${thread.id}`)}>
          <Surface style={styles.threadItem}>
            <Text style={styles.title}>{thread.title}</Text>
            {thread.lastMessage && (
              <Text style={styles.lastMessage} numberOfLines={1}>
                {thread.lastMessage}
              </Text>
            )}
            {thread.lastMessageTime && <Text style={styles.time}>{thread.lastMessageTime}</Text>}
          </Surface>
        </Pressable>
      ))}
    </View>
  );
}
