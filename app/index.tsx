import { useEffect, useState } from "react";
import * as WebBrowser from 'expo-web-browser';
import { Button, SafeAreaView, Text, View } from "react-native";
import {
  makeRedirectUri,
  useAuthRequest,
  exchangeCodeAsync,
  TokenResponse,
} from "expo-auth-session";

// Based on https://docs.expo.dev/guides/authentication/#calendly
WebBrowser.maybeCompleteAuthSession();

const clientId = "848afde1-2521-4ef5-8b6d-4dc44ee7a304";
const oAuth2Endpoints = {
  authorizationEndpoint: "https://api.medplum.com/oauth2/authorize",
  tokenEndpoint: "https://api.medplum.com/oauth2/token",
};

export default function Index() {
  const [authTokens, setAuthTokens] = useState<TokenResponse>();
  // Redirect URI must match Medplum config.
  // Currently it's like exp://192.168.1.10:8081, but should be like myapp://
  // See https://stackoverflow.com/a/78073461
  const redirectUri = makeRedirectUri({
    native: "myapp://",
  });
  const [loginRequest, loginResponse, promptLoginAsync] = useAuthRequest(
    {
      clientId: clientId,
      usePKCE: false,
      redirectUri: redirectUri,
      scopes: ["openid"],
    },
    oAuth2Endpoints
  );

  useEffect(() => {
    const exchange = async (exchangeTokenReq: string) => {
      if (!loginRequest) return;

      try {
        const exchangeTokenResponse = await exchangeCodeAsync(
          {
            clientId: clientId,
            code: exchangeTokenReq,
            redirectUri: redirectUri,
            extraParams: {
              code_verifier: loginRequest.codeVerifier ?? "",
            },
          },
          oAuth2Endpoints
        );
        setAuthTokens(exchangeTokenResponse);
        console.log(exchangeTokenResponse);
      } catch (error) {
        console.error("error", error);
      }
    };

    if (loginResponse) {
      if (loginResponse.type == "error") {
        console.error(
          "Authentication error",
          loginResponse.params.error_description || "something went wrong"
        );
      }
      if (loginResponse.type === "success") {
        exchange(loginResponse.params.code);
      }
    }
  }, [oAuth2Endpoints, loginRequest, loginResponse]);

  return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text>OAuth2 Medplum</Text>
        <Button
          title="Connect to Medplum"
          disabled={!loginRequest}
          onPress={() => {
            promptLoginAsync();
          }}
        />
      </View>
  );
}
