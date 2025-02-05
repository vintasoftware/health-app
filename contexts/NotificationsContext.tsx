import { MedplumClient } from "@medplum/core";
import { useMedplum } from "@medplum/react-hooks";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

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

async function getPushToken() {
  let token;

  if (!Device.isDevice || Platform.OS === "web") {
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      throw new Error("Missing EAS project ID");
    }

    token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return token?.data;
  } catch (error) {
    console.error("Error getting push token:", error);
  }
}

async function updateProfilePushToken(medplum: MedplumClient, token: string) {
  try {
    const profile = medplum.getProfile();
    if (!profile) return;

    // Check if token already exists and matches
    const existingToken = profile.extension?.find(
      (e) => e.url === "https://medplum.com/push-token",
    )?.valueString;

    if (existingToken === token) {
      return; // Token hasn't changed, no need to update
    }

    // Update the token
    const extensions =
      profile.extension?.filter((e) => e.url !== "https://medplum.com/push-token") || [];
    extensions.push({
      url: "https://medplum.com/push-token",
      valueString: token,
    });
    await medplum.updateResource({
      ...profile,
      extension: extensions,
    });
  } catch (error) {
    console.error("Error updating push token in Medplum:", error);
  }
}

function handleMessageNotificationInteraction(response: Notifications.NotificationResponse) {
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

  // Effect to handle notifications when app is terminated
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
