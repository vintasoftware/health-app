import { EllipsisVerticalIcon, PlusIcon } from "lucide-react-native";
import { useState } from "react";

import { CreateThreadModal } from "@/components/CreateThreadModal";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Popover, PopoverBody, PopoverContent } from "@/components/ui/popover";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";
import { useThreads } from "@/hooks/headless/useThreads";

interface ThreadListHeaderProps {
  onLogout?: () => void;
}

export function ThreadListHeader({ onLogout }: ThreadListHeaderProps) {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { createThread } = useThreads();

  return (
    <>
      <View className="h-16 flex-row items-center justify-between px-4 bg-background-50">
        <Text size="lg" bold>
          Chat threads
        </Text>

        <View className="flex-row items-center gap-2">
          <Button
            variant="outline"
            action="primary"
            size="sm"
            onPress={() => setIsCreateModalOpen(true)}
          >
            <ButtonIcon as={PlusIcon} size="sm" />
            <ButtonText>New Thread</ButtonText>
          </Button>

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
                  className="flex-row items-center p-1 active:bg-secondary-600"
                >
                  <Text>Logout</Text>
                </Pressable>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </View>
      </View>

      <CreateThreadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateThread={createThread}
      />
    </>
  );
}
