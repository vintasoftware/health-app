import { LoginState, MedplumClient } from "@medplum/core";
import { useMedplum } from "@medplum/react-hooks";
import {
  AuthRequest,
  AuthSessionResult,
  exchangeCodeAsync,
  makeRedirectUri,
  useAuthRequest,
} from "expo-auth-session";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Alert, Button } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

// Based on https://docs.expo.dev/guides/authentication/#calendly
WebBrowser.maybeCompleteAuthSession();

const oauth2ClientId = process.env.EXPO_PUBLIC_MEDPLUM_CLIENT_ID!;
const oAuth2Endpoints = {
  authorizationEndpoint: "https://api.medplum.com/oauth2/authorize",
  tokenEndpoint: "https://api.medplum.com/oauth2/token",
  userInfoEndpoint: "https://api.medplum.com/oauth2/userinfo",
};

async function handleLogin(
  medplum: MedplumClient,
  loginRequest: AuthRequest,
  loginResponse: AuthSessionResult,
): Promise<void> {
  if (loginResponse.type !== "success") {
    throw new Error("Authentication error", {
      cause: "unexpected response type != success",
    });
  }

  try {
    const tokenResponse = await exchangeCodeAsync(
      {
        clientId: oauth2ClientId,
        code: loginResponse.params.code,
        redirectUri: loginRequest.redirectUri,
        extraParams: {
          code_verifier: loginRequest.codeVerifier!,
        },
      },
      oAuth2Endpoints,
    );
    medplum.clearActiveLogin();
    await medplum.setActiveLogin({
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      // ignore missing project and profile attributes, they are set by setActiveLogin
    } as LoginState);
  } catch (error) {
    throw new Error("Authentication error", {
      cause: error,
    });
  }
}

export default function SignIn() {
  const router = useRouter();
  const [loginRequest, loginResponse, promptLoginAsync] = useAuthRequest(
    {
      clientId: oauth2ClientId,
      usePKCE: true,
      // Redirect URI must match Medplum config.
      // Currently it's like exp://192.168.1.10:8081, but should be like myapp://
      // See https://stackoverflow.com/a/78073461
      redirectUri: makeRedirectUri({
        native: "myapp://",
      }),
      scopes: ["openid"],
    },
    oAuth2Endpoints,
  );
  const [loading, setLoading] = useState(false);
  const medplum = useMedplum();

  // Handle login response:
  useEffect(() => {
    if (!loginRequest) return;
    if (!loginResponse) return;

    if (loginResponse.type === "error") {
      Alert.alert(
        "Authentication error",
        loginResponse.params.error_description || "something went wrong",
      );
      if (__DEV__) {
        console.error(JSON.stringify(loginResponse));
      }
    } else if (loginResponse.type === "success") {
      setLoading(true);
      handleLogin(medplum, loginRequest, loginResponse)
        .then(() => {
          // Workaround for disabling back button after login:
          if (router.canDismiss()) {
            router.dismissAll();
          }
          router.replace("/");
        })
        .catch((error) => {
          Alert.alert("Authentication error", error.message);
          if (__DEV__) {
            console.error(error.cause);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [loginRequest, loginResponse, medplum, router]);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {loading && <ActivityIndicator size="large" />}
      {!loading && (
        <Button
          title="Connect to Medplum"
          disabled={!loginRequest}
          onPress={() => {
            setLoading(true);
            promptLoginAsync().finally(() => setLoading(false));
          }}
        />
      )}
    </SafeAreaView>
  );
}
