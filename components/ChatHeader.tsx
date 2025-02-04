import { Patient, Practitioner } from "@medplum/fhirtypes";
import { Reference } from "@medplum/fhirtypes";
import { useMedplumContext } from "@medplum/react-hooks";
import { useRouter } from "expo-router";
import { ChevronLeftIcon, TrashIcon, UserRound, XIcon } from "lucide-react-native";
import { useMemo } from "react";
import { View } from "react-native";

import { LoadingButtonSpinner } from "@/components/LoadingButtonSpinner";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { Thread } from "@/models/chat";

function ChatStatus({ currentThread }: { currentThread: Thread }) {
  const { profile } = useMedplumContext();
  const isPatient = profile?.resourceType === "Patient";

  const { color, message } = useMemo(() => {
    if (!isPatient && !currentThread.lastMessageSentAt) {
      return {
        color: "bg-warning-500",
        message: "No messages yet",
      };
    }
    if (!isPatient) {
      return {
        color: "bg-tertiary-500",
        message: "Provide timely responses",
      };
    }
    if (!currentThread.lastMessageSentAt) {
      return {
        color: "bg-warning-500",
        message: "Please start the conversation",
      };
    }
    if (currentThread.practitionerName) {
      return {
        color: "bg-success-500",
        message: `${currentThread.practitionerName} is active`,
      };
    }
    return {
      color: "bg-tertiary-500",
      message: "A provider will respond to you soon",
    };
  }, [currentThread, isPatient]);

  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`h-2 w-2 rounded-full ${color}`} />
      <Text size="sm" className="text-typography-600">
        {message}
      </Text>
    </View>
  );
}

export interface ChatHeaderProps {
  currentThread: Thread;
  getAvatarURL: (
    reference: Reference<Patient | Practitioner> | undefined,
  ) => string | null | undefined;
  selectedCount?: number;
  onDelete?: () => void;
  onCancelSelection?: () => void;
  isDeleting?: boolean;
}

export function ChatHeader({
  currentThread,
  getAvatarURL,
  selectedCount = 0,
  onDelete,
  onCancelSelection,
  isDeleting = false,
}: ChatHeaderProps) {
  const router = useRouter();
  const { profile } = useMedplumContext();
  const avatarURL = getAvatarURL(currentThread.getAvatarRef({ profile }));

  const isSelectionMode = selectedCount > 0;

  return (
    <View className="border-b border-outline-100 bg-background-0">
      <View className="h-16 flex-row items-center justify-between px-2">
        <Pressable
          className="mr-2 rounded-full p-2 active:bg-secondary-100"
          onPress={() => {
            if (isSelectionMode) {
              onCancelSelection?.();
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          }}
        >
          <Icon
            as={isSelectionMode ? XIcon : ChevronLeftIcon}
            size="md"
            className="text-typography-700"
          />
        </Pressable>
        {isSelectionMode ? (
          <View className="flex-1 flex-row items-center justify-between">
            <Text size="md" bold className="text-typography-900">
              {selectedCount} selected
            </Text>
            <Button
              variant="solid"
              action="negative"
              size="sm"
              onPress={onDelete}
              disabled={isDeleting}
              className="mr-2"
            >
              {isDeleting ? (
                <LoadingButtonSpinner />
              ) : (
                <>
                  <ButtonIcon as={TrashIcon} size="sm" />
                  <ButtonText>Delete</ButtonText>
                </>
              )}
            </Button>
          </View>
        ) : (
          <View className="flex-1 flex-row items-center gap-3">
            <Avatar size="md" className="border-2 border-primary-200">
              <Icon as={UserRound} size="lg" className="stroke-typography-0" />
              {avatarURL && <AvatarImage source={{ uri: avatarURL }} />}
            </Avatar>
            <View className="flex-col">
              <Text size="md" bold className="text-typography-900">
                {currentThread.topic}
              </Text>
              <ChatStatus currentThread={currentThread} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
