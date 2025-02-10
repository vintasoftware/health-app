import { MedplumClient } from "@medplum/core";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function getPushToken() {
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

export async function updateProfilePushToken(medplum: MedplumClient, token: string) {
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

export async function clearProfilePushToken(medplum: MedplumClient) {
  try {
    const profile = medplum.getProfile();
    if (!profile) return;

    // Filter out the push token extension
    const extensions =
      profile.extension?.filter((e) => e.url !== "https://medplum.com/push-token") || [];

    // Update the profile with the filtered extensions
    await medplum.updateResource({
      ...profile,
      extension: extensions,
    });
  } catch (error) {
    console.error("Error clearing push token from Medplum:", error);
  }
}
