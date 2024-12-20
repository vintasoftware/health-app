import { useRouter } from "expo-router";
import { View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { ChevronLeftIcon, Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

export function ChatHeader() {
  const router = useRouter();

  return (
    <View className="flex-row items-center p-2 bg-background-50">
      <Pressable
        className="p-2 mr-2 active:bg-secondary-600"
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/");
          }
        }}
      >
        <Icon as={ChevronLeftIcon} size="md" />
      </Pressable>
      <View className="flex-row items-center gap-3">
        <Avatar size="md">
          <Text>DR</Text>
        </Avatar>
        <View className="flex-col">
          <Text size="md">Sample Practice</Text>
          <Text size="sm">Online</Text>
        </View>
      </View>
    </View>
  );
}
