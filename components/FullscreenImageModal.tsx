import { Image } from "expo-image";
import { X } from "lucide-react-native";
import { memo, useState } from "react";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Modal, ModalBackdrop, ModalCloseButton, ModalContent } from "@/components/ui/modal";

interface FullscreenImageModalProps {
  uri: string;
  alt?: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
}

export const FullscreenImageModal = memo(
  ({ uri, alt, thumbnailWidth, thumbnailHeight }: FullscreenImageModalProps) => {
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

    return (
      <>
        <Pressable onPress={() => setIsFullscreenOpen(true)}>
          <Image
            style={{ width: thumbnailWidth, height: thumbnailHeight }}
            source={uri}
            contentFit="cover"
            alt={alt}
          />
        </Pressable>
        <Modal isOpen={isFullscreenOpen}>
          <ModalBackdrop />
          <ModalContent className="m-0 h-full w-full rounded-none border-0 bg-background-dark p-0">
            <View className="relative flex-1">
              <ModalCloseButton
                className="absolute right-4 top-4 z-10 rounded-full bg-background-0/80 p-2"
                onPress={() => setIsFullscreenOpen(false)}
              >
                <Icon as={X} size="lg" className="text-typography-900" />
              </ModalCloseButton>
              <Image
                source={uri}
                style={{ width: "100%", height: "100%" }}
                contentFit="contain"
                alt={alt}
              />
            </View>
          </ModalContent>
        </Modal>
      </>
    );
  },
);

FullscreenImageModal.displayName = "FullscreenImageModal";
