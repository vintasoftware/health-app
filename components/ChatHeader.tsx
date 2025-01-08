import { useRouter } from "expo-router";
import { ChevronLeftIcon } from "lucide-react-native";
import { View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

export function ChatHeader() {
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
            <Text className="text-typography-0">DR</Text>
          </Avatar>
          <View className="flex-col">
            <Text size="md" bold className="text-typography-900">
              Sample Practice
            </Text>
            <View className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full bg-success-500" />
              <Text size="sm" className="text-typography-600">
                Online
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
