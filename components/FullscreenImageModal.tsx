import { Image } from "expo-image";
import { X } from "lucide-react-native";
import { memo, useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

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
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    // Calculate scales and boundaries based on actual image dimensions
    const imageAspectRatio = imageSize.width / imageSize.height;
    const screenAspectRatio = screenWidth / screenHeight;

    // Calculate the actual displayed image size at scale 1
    const displayedSize =
      imageAspectRatio > screenAspectRatio
        ? { width: screenWidth, height: screenWidth / imageAspectRatio }
        : { width: screenHeight * imageAspectRatio, height: screenHeight };

    const minScale =
      imageAspectRatio > screenAspectRatio ? 1 : screenAspectRatio / imageAspectRatio;

    const panGesture = Gesture.Pan()
      .onUpdate((e) => {
        if (scale.value > 1) {
          // Calculate boundaries based on scaled image size vs screen size
          const scaledWidth = displayedSize.width * scale.value;
          const scaledHeight = displayedSize.height * scale.value;

          const maxX = Math.max(0, (scaledWidth - screenWidth) / 2);
          const maxY = Math.max(0, (scaledHeight - screenHeight) / 2);

          const newX = savedTranslateX.value + e.translationX;
          const newY = savedTranslateY.value + e.translationY;

          translateX.value = Math.min(Math.max(newX, -maxX), maxX);
          translateY.value = Math.min(Math.max(newY, -maxY), maxY);
        }
      })
      .onEnd(() => {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      });

    const pinchGesture = Gesture.Pinch()
      .onUpdate((e) => {
        // Clamp scale between minScale and a maximum (e.g., 4)
        const newScale = savedScale.value * e.scale;
        scale.value = Math.min(Math.max(newScale, minScale), 4);
      })
      .onEnd(() => {
        savedScale.value = scale.value;
      });

    const gesture = Gesture.Simultaneous(pinchGesture, panGesture);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    }));

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
                onPress={() => {
                  setIsFullscreenOpen(false);
                  scale.value = 1;
                  savedScale.value = 1;
                  translateX.value = 0;
                  translateY.value = 0;
                  savedTranslateX.value = 0;
                  savedTranslateY.value = 0;
                }}
              >
                <Icon as={X} size="lg" className="text-typography-900" />
              </ModalCloseButton>
              <GestureHandlerRootView className="flex-1">
                <GestureDetector gesture={gesture}>
                  <Animated.View className="flex-1" style={animatedStyle}>
                    <Image
                      source={uri}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="contain"
                      alt={alt}
                      onLoad={(e) => {
                        setImageSize({
                          width: e.source.width,
                          height: e.source.height,
                        });
                      }}
                    />
                  </Animated.View>
                </GestureDetector>
              </GestureHandlerRootView>
            </View>
          </ModalContent>
        </Modal>
      </>
    );
  },
);

FullscreenImageModal.displayName = "FullscreenImageModal";
