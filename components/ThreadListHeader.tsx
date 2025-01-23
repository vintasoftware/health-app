import { useMedplumContext } from "@medplum/react-hooks";
import { EllipsisVerticalIcon, PlusIcon } from "lucide-react-native";
import { useState } from "react";
import { Platform } from "react-native";

import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Popover, PopoverBackdrop, PopoverBody, PopoverContent } from "@/components/ui/popover";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";

interface ThreadListHeaderProps {
  onLogout?: () => void;
  onCreateThread?: () => void;
}

export function ThreadListHeader({ onLogout, onCreateThread }: ThreadListHeaderProps) {
  const { profile } = useMedplumContext();
  const isPatient = profile?.resourceType === "Patient";
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  return (
    <View className="border-b border-outline-100 bg-background-0">
      <View className="h-16 flex-row items-center justify-between px-4">
        <Text size="lg" bold className="text-typography-900">
          Chat threads
        </Text>

        <View className="flex-row items-center gap-2">
          {isPatient && onCreateThread && (
            <Button variant="outline" action="primary" size="sm" onPress={() => onCreateThread()}>
              <ButtonIcon as={PlusIcon} size="sm" />
              <ButtonText>New Thread</ButtonText>
            </Button>
          )}

          <Popover
            onClose={() => setIsMenuVisible(false)}
            offset={Platform.OS !== "web" ? -10 : 0}
            placement="bottom right"
            isOpen={isMenuVisible}
            trigger={(triggerProps) => (
              <Pressable
                {...triggerProps}
                onPress={() => setIsMenuVisible(true)}
                className="rounded-full p-2 active:bg-secondary-100"
              >
                <Icon as={EllipsisVerticalIcon} size="md" className="text-typography-700" />
              </Pressable>
            )}
          >
            <PopoverBackdrop />
            <PopoverContent>
              <PopoverBody>
                <Pressable
                  onPress={() => {
                    setIsMenuVisible(false);
                    onLogout?.();
                  }}
                  className="flex-row items-center p-2 active:bg-secondary-100"
                >
                  <Text className="text-typography-700">Logout</Text>
                </Pressable>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </View>
      </View>
    </View>
  );
}
