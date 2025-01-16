import { LoginState } from "@medplum/core";
import { useMedplum } from "@medplum/react-hooks";
import {
  AuthRequest,
  exchangeCodeAsync,
  makeRedirectUri,
  ResponseError,
  TokenResponse,
} from "expo-auth-session";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";
import { Alert, Button, View } from "react-native";

import { Spinner } from "@/components/ui/spinner";
import { oauth2ClientId, oAuth2Discovery } from "@/utils/medplum-oauth2";

// Based on https://docs.expo.dev/guides/authentication/#calendly
WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  const router = useRouter();
  const medplum = useMedplum();
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const isLoading = isLoginLoading || !medplum.isInitialized;

  const redirectAfterLogin = useCallback(() => {
    // Workaround for disabling back button after login:
    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace("/");
  }, [router]);

  const processTokenResponse = useCallback(
    async (tokenResponse: TokenResponse) => {
      await medplum.setActiveLogin({
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
      } as LoginState);

      redirectAfterLogin();
    },
    [medplum, redirectAfterLogin],
  );

  const medplumLogin = useCallback(async () => {
    const loginRequest = new AuthRequest({
      clientId: oauth2ClientId,
      usePKCE: true,
      // Redirect URI must match Medplum config.
      // Currently it's like exp://192.168.1.10:8081, but should be like myapp://
      // See https://stackoverflow.com/a/78073461
      redirectUri: makeRedirectUri(),
      scopes: ["openid"],
    });
    let loginResponse;
    try {
      loginResponse = await loginRequest.promptAsync(oAuth2Discovery);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Authentication error", error.message);
        if (__DEV__) {
          console.error(error);
        }
      }
      return;
    }

    if (loginResponse.type === "error") {
      Alert.alert(
        "Authentication error",
        loginResponse.params.error_description || "something went wrong",
      );
      if (__DEV__) {
        console.error(loginResponse.params.error_description);
      }
      return;
    }

    if (loginResponse.type === "success") {
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
          oAuth2Discovery,
        );
        await processTokenResponse(tokenResponse);
      } catch (error) {
        if (error instanceof ResponseError) {
          if (
            error.code === "invalid_request" &&
            error.description?.includes("Invalid code verifier")
          ) {
            // If the user tries to login right after unsuccessfully logging out,
            // the server returns an invalid_request error.
            // We can ignore and try again:
            return medplumLogin();
          }
          Alert.alert("Authentication error", error.message);
          if (__DEV__) {
            console.error(error);
          }
        }
      }
    }
  }, [processTokenResponse]);

  const handleLogin = useCallback(() => {
    setIsLoginLoading(true);
    medplumLogin().finally(() => setIsLoginLoading(false));
  }, [medplumLogin]);

  return (
    <View className="flex-1 items-center justify-center">
      {isLoading && <Spinner size="large" />}
      {!isLoading && <Button title="Connect to Medplum" onPress={handleLogin} />}
    </View>
  );
}
