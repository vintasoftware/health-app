import { useMedplum } from "@medplum/react-hooks";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { getPushToken, updateProfilePushToken } from "@/utils/notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationsContextType {
  isNotificationsEnabled: boolean;
  setUpPushNotifications: () => Promise<boolean>;
}

const NotificationsContext = createContext<NotificationsContextType>({
  isNotificationsEnabled: false,
  setUpPushNotifications: async () => false,
});

// Handle notification interaction (e.g. clicking on a notification)
function handleMessageNotificationInteraction(response: Notifications.NotificationResponse) {
  // Redirect to thread after user clicks on notification
  const data = response.notification.request.content.data;
  if (data.threadId) {
    router.push(`/thread/${data.threadId}`);
  }
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);
  const responseListener = useRef<Notifications.EventSubscription>();
  const medplum = useMedplum();

  const setUpPushNotifications = useCallback(async () => {
    if (Platform.OS === "web") return false;

    // Check and request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      ({ status: finalStatus } = await Notifications.requestPermissionsAsync());
    }

    // Set up push notifications if we have permission
    const isEnabled = finalStatus === "granted";
    setIsNotificationsEnabled(isEnabled);
    if (isEnabled) {
      const token = await getPushToken();
      if (token) {
        await updateProfilePushToken(medplum, token);
      }

      // Set up notification listeners
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        handleMessageNotificationInteraction,
      );
    }
    return isEnabled;
  }, [medplum]);

  // Effect to handle notifications when app is reopened from terminated state
  useEffect(() => {
    if (Platform.OS === "web") return;

    const getInitialNotification = async () => {
      const lastNotificationResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastNotificationResponse) {
        handleMessageNotificationInteraction(lastNotificationResponse);
      }
    };

    getInitialNotification();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      responseListener.current?.remove();
    };
  }, [responseListener]);

  return (
    <NotificationsContext.Provider
      value={{
        isNotificationsEnabled,
        setUpPushNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
