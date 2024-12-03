import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, Text, View } from "react-native";
import {
  makeRedirectUri,
  useAuthRequest,
  exchangeCodeAsync,
  TokenResponse,
  AuthSessionResult,
  AuthRequest,
} from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { fetch } from "expo/fetch";
import { Patient } from "@medplum/fhirtypes";

// Based on https://docs.expo.dev/guides/authentication/#calendly
WebBrowser.maybeCompleteAuthSession();

const oauth2ClientId = "848afde1-2521-4ef5-8b6d-4dc44ee7a304";
const oAuth2Endpoints = {
  authorizationEndpoint: "https://api.medplum.com/oauth2/authorize",
  tokenEndpoint: "https://api.medplum.com/oauth2/token",
  userInfoEndpoint: "https://api.medplum.com/oauth2/userinfo",
};

const baseFHIRUrl = "https://api.medplum.com/fhir/R4";

async function handleLogin(
  loginRequest: AuthRequest,
  loginResponse: AuthSessionResult,
): Promise<TokenResponse> {
  if (loginResponse.type !== "success") {
    throw new Error("Authentication error", {
      cause: "Unexpected response type != success",
    });
  }

  try {
    return await exchangeCodeAsync(
      {
        clientId: oauth2ClientId,
        code: loginResponse.params.code,
        redirectUri: loginRequest.redirectUri,
        extraParams: {
          code_verifier: loginRequest.codeVerifier ?? "",
        },
      },
      oAuth2Endpoints,
    );
  } catch (error) {
    throw new Error("Authentication error on exchangeCodeAsync", {
      cause: error,
    });
  }
}

async function fhirFetch(
  url: string,
  authTokens: TokenResponse,
  init?: Parameters<typeof fetch>[1],
) {
  const response = await fetch(`${baseFHIRUrl}/${url}`, {
    ...init,
    headers: {
      Authorization: `${authTokens?.tokenType} ${authTokens?.accessToken}`,
      Accept: "application/fhir+json",
      "Content-Type": "application/fhir+json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(await response.json());
  }
  return await response.json();
}

async function fetchLoggedPatient(authTokens: TokenResponse): Promise<Patient> {
  const userInfoResponse = await fetch(oAuth2Endpoints.userInfoEndpoint, {
    headers: {
      Authorization: `${authTokens?.tokenType} ${authTokens?.accessToken}`,
      "Content-Type": "application/json",
    },
  });
  const userInfo = await userInfoResponse.json();
  const patient = await fhirFetch(`Patient/${userInfo.sub}`, authTokens);
  return patient;
}

export default function Index() {
  const [authTokens, setAuthTokens] = useState<TokenResponse>();
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
      handleLogin(loginRequest, loginResponse)
        .then(setAuthTokens)
        .finally(() => setLoading(false));
    }
  }, [loginRequest, loginResponse]);

  // After login, fetch patient:
  useEffect(() => {
    if (authTokens) {
      setLoading(true);
      fetchLoggedPatient(authTokens)
        .then(setPatient)
        .finally(() => setLoading(false));
    }
  }, [authTokens]);

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
