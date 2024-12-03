import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, Text, View } from "react-native";
import { LoginState, MedplumClient } from "@medplum/core";
import {
  makeRedirectUri,
  useAuthRequest,
  exchangeCodeAsync,
  AuthSessionResult,
  AuthRequest,
  ResponseError,
  TokenError,
} from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { fetch } from "expo/fetch";
import { Patient } from "@medplum/fhirtypes";
import { useMedplum } from "@medplum/react-hooks";

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
): Promise<Patient> {
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
    const profile = medplum.getProfile()!;

    if (!profile) {
      throw new Error("Authentication error", {
        cause: "missing profile",
      });
    }
    if (profile.resourceType !== "Patient") {
      throw new Error("Authentication error", {
        cause: `unexpected login on resourceType == ${profile.resourceType}`,
      });
    }

    return profile as Patient;
  } catch (error) {
    throw new Error("Authentication error", {
      cause: error,
    });
  }
}

export default function Index() {
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
  const [patient, setPatient] = useState<Patient>();

  // Handle login response:
  useEffect(() => {
    if (!loginRequest) return;
    if (!loginResponse) return;

    if (loginResponse.type === "error") {
      Alert.alert(
        "Authentication error",
        loginResponse.params.error_description || "something went wrong",
      );
    }
    if (loginResponse.type === "success") {
      setLoading(true);
      handleLogin(medplum, loginRequest, loginResponse)
        .then(setPatient)
        .catch((error) => {
          Alert.alert("Authentication error", error.message);
        })
        .finally(() => setLoading(false));
    }
  }, [loginRequest, loginResponse, medplum]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {loading && <ActivityIndicator />}
      {!loading && patient && (
        <Text>
          Hello {patient.name?.[0]?.given?.[0]} {patient.name?.[0]?.family}
        </Text>
      )}
      {!loading && !patient && (
        <Button
          title="Connect to Medplum"
          disabled={!loginRequest}
          onPress={() => {
            setLoading(true);
            promptLoginAsync().finally(() => setLoading(false));
          }}
        />
      )}
    </View>
  );
}
