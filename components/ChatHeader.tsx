import { useRouter } from "expo-router";
import { ChevronLeftIcon, UserRound } from "lucide-react-native";
import { useMemo } from "react";
import { View } from "react-native";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { Thread } from "@/models/chat";

function ChatStatus({ currentThread }: { currentThread: Thread }) {
  const { color, message } = useMemo(() => {
    if (!currentThread.lastMessageSentAt) {
      return {
        color: "bg-warning-500",
        message: "Please start the conversation",
      };
    }
    if (currentThread.practitionerName) {
      return {
        color: "bg-success-500",
        message: `${currentThread.practitionerName} is active`,
      };
    }
    return {
      color: "bg-error-500",
      message: "A provider will respond to you soon",
    };
  }, [currentThread]);
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`h-2 w-2 rounded-full ${color}`} />
      <Text size="sm" className="text-typography-600">
        {message}
      </Text>
    </View>
  );
}

export function ChatHeader({ currentThread }: { currentThread: Thread }) {
  const router = useRouter();

  return (
    <View className="border-b border-outline-100 bg-background-0">
      <View className="h-16 flex-row items-center justify-between px-2">
        <Pressable
          className="mr-2 rounded-full p-2 active:bg-secondary-100"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          }}
        >
          <Icon as={ChevronLeftIcon} size="md" className="text-typography-700" />
        </Pressable>
        <View className="flex-1 flex-row items-center gap-3">
          <Avatar size="md" className="border-2 border-primary-200">
            <Icon as={UserRound} size="lg" className="stroke-white" />
            <AvatarImage source={{ uri: currentThread.avatarURL }} />
          </Avatar>
          <View className="flex-col">
            <Text size="md" bold className="text-typography-900">
              {currentThread.topic}
            </Text>
            <ChatStatus currentThread={currentThread} />
          </View>
        </View>
      </View>
    </View>
  );
}
