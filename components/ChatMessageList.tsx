import { StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { ChatMessageBubble } from "./ChatMessageBubble";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  withDelay,
} from "react-native-reanimated";
import { useEffect } from "react";
import type { ChatMessage } from "@/types/chat";

interface ChatMessageListProps {
  messages: ChatMessage[];
  loading: boolean;
}

const styles = StyleSheet.create({
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messagesContentContainer: {
    gap: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    gap: 4,
    padding: 8,
    justifyContent: "center",
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "gray",
    opacity: 0.5,
  },
});

function LoadingDots() {
  const dots = [0, 1, 2];
  const opacities = [useSharedValue(0.5), useSharedValue(0.5), useSharedValue(0.5)];
  const animatedStyles = [
    useAnimatedStyle(() => ({ opacity: opacities[0].value })),
    useAnimatedStyle(() => ({ opacity: opacities[1].value })),
    useAnimatedStyle(() => ({ opacity: opacities[2].value })),
  ];

  useEffect(() => {
    dots.forEach((index) => {
      opacities[index].value = withRepeat(
        withSequence(
          withDelay(index * 200, withTiming(1, { duration: 400 })),
          withTiming(0.5, { duration: 400 }),
        ),
        -1,
        true,
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={styles.loadingContainer}>
      {dots.map((index) => (
        <Animated.View key={index} style={[styles.loadingDot, animatedStyles[index]]} />
      ))}
    </Animated.View>
  );
}

export function ChatMessageList({ messages, loading }: ChatMessageListProps) {
  return (
    <ScrollView
      style={styles.messagesContainer}
      contentContainerStyle={styles.messagesContentContainer}
    >
      {messages.map((message) => (
        <ChatMessageBubble key={message.id} message={message} />
      ))}
      {loading && <LoadingDots />}
    </ScrollView>
  );
}
