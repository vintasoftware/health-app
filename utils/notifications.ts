import { MedplumClient } from "@medplum/core";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Manages push notification tokens for the application, handling token generation,
 * storage, and synchronization with the Medplum profile.
 *
 * @example
 * ```typescript
 * const manager = new PushNotificationTokenManager(medplum);
 * await manager.updateProfilePushToken(); // Generates and stores a new push token in the user profile
 * await manager.clearProfilePushToken(); // Removes the push token from the user profile (useful on logout)
 * ```
 */
export class PushNotificationTokenManager {
  private medplum: MedplumClient;

  /**
   * Creates a new instance of PushNotificationTokenManager.
   * @param medplum - The MedplumClient instance used for API operations
   */
  constructor(medplum: MedplumClient) {
    this.medplum = medplum;
  }

  /**
   * Generates a new Expo push notification token.
   * This method handles platform-specific setup and requirements.
   * It does nothing on web.
   *
   * @returns A promise that resolves to the push token string or undefined if token cannot be generated
   * @private
   */
  private async getPushToken(): Promise<string | undefined> {
    if (!Device.isDevice || Platform.OS === "web") {
      return undefined;
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

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      return token?.data;
    } catch (error) {
      console.error("Error getting push token:", error);
      return undefined;
    }
  }

  /**
   * Updates the user's profile with a new push notification token.
   * If no token is provided, generates a new one using getPushToken().
   *
   * @param token - Optional push notification token. If not provided, generates a new one.
   * @returns A promise that resolves when the operation is complete
   */
  async updateProfilePushToken(token?: string): Promise<void> {
    try {
      const profile = this.medplum.getProfile();
      if (!profile) return;

      // If no token is provided, get a new one
      const pushToken = token || (await this.getPushToken());
      if (!pushToken) return;

      // Check if token already exists and matches
      const existingToken = profile.extension?.find(
        (e) => e.url === "https://medplum.com/push-token",
      )?.valueString;

      if (existingToken === pushToken) {
        return; // Token hasn't changed, no need to update
      }

      // Update the token
      const extensions =
        profile.extension?.filter((e) => e.url !== "https://medplum.com/push-token") || [];
      extensions.push({
        url: "https://medplum.com/push-token",
        valueString: pushToken,
      });
      await this.medplum.updateResource({
        ...profile,
        extension: extensions,
      });
    } catch (error) {
      console.error("Error updating push token in Medplum:", error);
    }
  }

  /**
   * Removes the push notification token from the user's profile.
   * This should be called during logout to ensure the token is properly cleaned up.
   *
   * @returns A promise that resolves when the operation is complete
   */
  async clearProfilePushToken(): Promise<void> {
    try {
      const profile = this.medplum.getProfile();
      if (!profile) return;

      // Filter out the push token extension
      const extensions =
        profile.extension?.filter((e) => e.url !== "https://medplum.com/push-token") || [];

      // Update the profile with the filtered extensions
      await this.medplum.updateResource({
        ...profile,
        extension: extensions,
      });
    } catch (error) {
      console.error("Error clearing push token from Medplum:", error);
    }
  }
}
