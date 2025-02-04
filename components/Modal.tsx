import { useCallback } from "react";
import { BackHandler, Modal as RNModal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

interface ModalHeaderProps {
  children: React.ReactNode;
}

interface ModalBodyProps {
  children: React.ReactNode;
}

interface ModalFooterProps {
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, children }: ModalProps) {
  const insets = useSafeAreaInsets();

  const handleBackPress = useCallback(() => {
    if (isOpen) {
      onClose();
      return true;
    }
    return false;
  }, [isOpen, onClose]);

  // Handle hardware back button on Android
  useCallback(() => {
    BackHandler.addEventListener("hardwareBackPress", handleBackPress);
    return () => {
      BackHandler.removeEventListener("hardwareBackPress", handleBackPress);
    };
  }, [handleBackPress]);

  if (!isOpen) return null;

  return (
    <RNModal
      visible={isOpen}
      onRequestClose={onClose}
      transparent
      statusBarTranslucent
      animationType="fade"
    >
      <View
        className="flex-1 justify-center bg-background-dark/50"
        style={{ paddingTop: insets.top }}
      >
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="mx-4 overflow-hidden rounded-2xl border border-outline-100 bg-background-0 shadow-hard-5">
          {children}
        </View>
      </View>
    </RNModal>
  );
}

export function ModalHeader({ children }: ModalHeaderProps) {
  return (
    <View className="border-b border-outline-100 p-4">
      <Text size="lg" bold>
        {children}
      </Text>
    </View>
  );
}

export function ModalBody({ children }: ModalBodyProps) {
  return <View className="p-4">{children}</View>;
}

export function ModalFooter({ children }: ModalFooterProps) {
  return <View className="flex-row justify-end gap-2 p-4">{children}</View>;
}
