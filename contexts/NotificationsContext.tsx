import { useMedplum } from "@medplum/react-hooks";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

import { PushNotificationTokenManager } from "@/utils/notifications";

// Configure default notification handling behavior
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

/**
 * Handles user interaction with a notification (e.g., tapping on it).
 * Currently supports navigation to chat threads when a message notification is tapped.
 *
 * @param response - The notification response containing interaction details
 */
function handleMessageNotificationInteraction(response: Notifications.NotificationResponse) {
  // Redirect to thread after user clicks on notification
  const data = response.notification.request.content.data;
  if (data.threadId) {
    router.push(`/thread/${data.threadId}`);
  }
}

/**
 * Provider component that manages push notification state and setup.
 * Handles permission requests, token management, and notification interactions.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <NotificationsProvider>
 *       <YourApp />
 *     </NotificationsProvider>
 *   );
 * }
 * ```
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);
  const responseListener = useRef<Notifications.EventSubscription>();
  const medplum = useMedplum();
  const tokenManager = useMemo(() => new PushNotificationTokenManager(medplum), [medplum]);

  /**
   * Sets up push notifications for the app.
   * Handles permission requests, token generation, and notification listeners.
   *
   * @returns A promise that resolves to true if notifications were successfully enabled
   */
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
      await tokenManager.updateProfilePushToken();

      // Set up notification listeners
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        handleMessageNotificationInteraction,
      );
    }
    return isEnabled;
  }, [tokenManager]);

  // Handle notifications when app is reopened from terminated state
  // e.g. tapping on a notification after the app was closed
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

  // Clean up
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

/**
 * Hook to access the push notifications context.
 * Provides access to notification state and setup functionality.
 *
 * @returns The notifications context value
 *
 * @example
 * ```tsx
 * function YourComponent() {
 *   const { isNotificationsEnabled, setUpPushNotifications } = useNotifications();
 *   // ...
 * }
 * ```
 */
export function useNotifications() {
  return useContext(NotificationsContext);
}
