import { Platform } from "react-native";

export const oauth2ClientId =
  Platform.OS === "web"
    ? process.env.EXPO_PUBLIC_WEB_MEDPLUM_CLIENT_ID!
    : process.env.EXPO_PUBLIC_NATIVE_MEDPLUM_CLIENT_ID!;
export const oAuth2Discovery = {
  authorizationEndpoint: "https://api.medplum.com/oauth2/authorize",
  tokenEndpoint: "https://api.medplum.com/oauth2/token",
  userInfoEndpoint: "https://api.medplum.com/oauth2/userinfo",
};
