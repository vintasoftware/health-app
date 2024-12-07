import { useContext, createContext, type PropsWithChildren } from "react";
import { ClientStorage, MedplumClient, MedplumClientOptions, stringify } from "@medplum/core";
import { MedplumProvider } from "@medplum/react-hooks";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { useRouter } from "expo-router";

class ExpoMedplumClientStorage extends ClientStorage {
  clear(): void {
    if (__DEV__) {
      console.debug("Can't clear SecureStore in Expo");
    }
  }

  getString(key: string): string | undefined {
    return SecureStore.getItem(key) ?? undefined;
  }

  setString(key: string, value: string | undefined): void {
    if (value) {
      SecureStore.setItem(key, value);
    } else {
      SecureStore.deleteItemAsync(key);
    }
  }

  getObject<T>(key: string): T | undefined {
    const str = this.getString(key);
    return str ? (JSON.parse(str) as T) : undefined;
  }

  setObject<T>(key: string, value: T): void {
    this.setString(key, value ? stringify(value) : undefined);
  }
}

class ReactNativeMedplumClient extends MedplumClient {
  /**
   * Clears all auth state.
   * @category Authentication
   */
  clear(): void {
    this.clearActiveLogin();
  }
}

export function initMedplumClient(options?: MedplumClientOptions) {
  return new ReactNativeMedplumClient({
    clientId: process.env.EXPO_PUBLIC_MEDPLUM_CLIENT_ID,
    storage: Platform.OS === "web" ? new ClientStorage() : new ExpoMedplumClientStorage(),
    ...options,
  });
}
