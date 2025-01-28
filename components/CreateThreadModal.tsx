import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useState } from "react";
import { Modal as RNModal, Pressable } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";

interface CreateThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateThread: (topic: string) => Promise<string | undefined>;
}

interface ModalHeaderProps {
  onClose: () => void;
}

function ModalHeader({ onClose }: ModalHeaderProps) {
  return (
    <View className="flex-row items-center justify-between border-b border-outline-100 p-4">
      <Text size="lg" bold>
        New Thread
      </Text>
      <Pressable
        className="mr-2 rounded-full p-2 active:bg-background-100"
        onPress={onClose}
        hitSlop={8}
      >
        <Icon as={X} size="lg" className="text-typography-700" />
      </Pressable>
    </View>
  );
}

interface ModalBodyProps {
  topic: string;
  isCreating: boolean;
  onTopicChange: (text: string) => void;
}

function ModalBody({ topic, isCreating, onTopicChange }: ModalBodyProps) {
  return (
    <View className="p-4">
      <View className="gap-2">
        <Input size="md" isDisabled={isCreating}>
          <InputField
            value={topic}
            onChangeText={onTopicChange}
            placeholder="Enter conversation topic..."
            className="min-h-[44px] py-3"
          />
        </Input>
      </View>
    </View>
  );
}

interface ModalFooterProps {
  onClose: () => void;
  onCreate: () => void;
  isCreating: boolean;
  isValid: boolean;
}

function ModalFooter({ onClose, onCreate, isCreating, isValid }: ModalFooterProps) {
  const { colorScheme } = useColorScheme();

  return (
    <View className="flex-row justify-end gap-2 p-4">
      <Button variant="outline" onPress={onClose} className="mr-2">
        <ButtonText>Cancel</ButtonText>
      </Button>
      <Button className="min-w-[100px]" disabled={!isValid || isCreating} onPress={onCreate}>
        {isCreating ? (
          <ButtonSpinner color={colorScheme === "dark" ? "black" : "white"} />
        ) : (
          <ButtonText>Create</ButtonText>
        )}
      </Button>
    </View>
  );
}

export function CreateThreadModal({ isOpen, onClose, onCreateThread }: CreateThreadModalProps) {
  const [topic, setTopic] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const handleClose = useCallback(() => {
    setTopic("");
    onClose();
  }, [onClose]);

  const handleCreate = useCallback(async () => {
    if (!topic.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const threadId = await onCreateThread(topic);
      if (threadId) {
        handleClose();
        router.push(`/thread/${threadId}`);
      }
    } finally {
      setIsCreating(false);
    }
  }, [topic, isCreating, onCreateThread, handleClose, router]);

  if (!isOpen) return null;

  return (
    <RNModal visible={isOpen} transparent animationType="fade" onRequestClose={handleClose}>
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        className="flex-1 bg-background-dark/50 dark:bg-background-dark/90"
      >
        <View
          className="flex-1 justify-center px-4"
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <Animated.View
            entering={FadeIn.delay(100)}
            className="overflow-hidden rounded-lg bg-background-0 dark:border dark:border-outline-100"
          >
            <ModalHeader onClose={handleClose} />
            <ModalBody topic={topic} isCreating={isCreating} onTopicChange={setTopic} />
            <ModalFooter
              onClose={handleClose}
              onCreate={handleCreate}
              isCreating={isCreating}
              isValid={Boolean(topic.trim())}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </RNModal>
  );
}
