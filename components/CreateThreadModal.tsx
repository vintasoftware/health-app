import { useRouter } from "expo-router";
import { useState } from "react";

import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";

interface CreateThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateThread: (topic: string) => Promise<string | undefined>;
}

export function CreateThreadModal({ isOpen, onClose, onCreateThread }: CreateThreadModalProps) {
  const [topic, setTopic] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!topic.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const threadId = await onCreateThread(topic);
      if (threadId) {
        onClose();
        router.push(`/thread/${threadId}`);
      }
    } finally {
      setIsCreating(false);
      setTopic("");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Text size="lg" bold>
            New Thread
          </Text>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody>
          <View className="gap-2">
            <Input size="md" isDisabled={isCreating}>
              <InputField
                value={topic}
                onChangeText={setTopic}
                placeholder="Enter conversation topic..."
                className="min-h-[44px] py-3"
              />
            </Input>
          </View>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onPress={() => onClose()} className="mr-2">
            <ButtonText>Cancel</ButtonText>
          </Button>
          <Button
            className="min-w-[100px]"
            disabled={!topic.trim() || isCreating}
            onPress={handleCreate}
          >
            {isCreating ? <Spinner size="small" color="white" /> : <ButtonText>Create</ButtonText>}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
