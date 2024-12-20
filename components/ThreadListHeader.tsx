import { EllipsisVerticalIcon } from "lucide-react-native";
import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { Popover, PopoverBody, PopoverContent } from "@/components/ui/popover";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";

interface ThreadListHeaderProps {
  onLogout?: () => void;
}

export function ThreadListHeader({ onLogout }: ThreadListHeaderProps) {
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  return (
    <View className="h-16 flex-row items-center justify-between px-4 bg-background-50">
      <Text size="lg" bold>
        Chat threads
      </Text>

      <Popover
        onClose={() => setIsMenuVisible(false)}
        isOpen={isMenuVisible}
        trigger={(triggerProps) => (
          <Pressable {...triggerProps} onPress={() => setIsMenuVisible(true)}>
            <Icon as={EllipsisVerticalIcon} size="lg" />
          </Pressable>
        )}
      >
        <PopoverContent>
          <PopoverBody>
            <Pressable
              onPress={() => {
                setIsMenuVisible(false);
                onLogout?.();
              }}
              className="flex-row items-center p-1 active:bg-gray-300"
            >
              <Text>Logout</Text>
            </Pressable>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </View>
  );
}
