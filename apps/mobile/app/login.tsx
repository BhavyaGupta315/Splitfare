import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Google from "expo-auth-session/providers/google";
import { ResponseType } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "@/context/auth";
import { Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/theme/colors";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    responseType: ResponseType.IdToken,
    scopes: ["openid", "profile", "email"],
  });

  useEffect(() => {
    if (!response) return;
    if (response.type !== "success") {
      if (response.type === "error") {
        setError(response.error?.message ?? "Google sign-in error");
      }
      return;
    }
    const idToken =
      response.params?.id_token ?? response.authentication?.idToken ?? null;
    if (!idToken) {
      setError(
        `Google did not return an ID token. Keys received: ${Object.keys(
          response.params ?? {}
        ).join(", ") || "(none)"}`
      );
      return;
    }
    (async () => {
      setSubmitting(true);
      setError(null);
      try {
        await login(idToken);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed");
      } finally {
        setSubmitting(false);
      }
    })();
  }, [response, login]);

  const handlePress = async () => {
    setError(null);
    if (!request) return;
    try {
      await promptAsync();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start Google sign-in");
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.heading}>
            <Text style={styles.title}>SplitFare</Text>
            <Text style={styles.subtitle}>Split expenses with friends</Text>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            onPress={handlePress}
            disabled={!request || submitting}
            style={({ pressed }) => [
              styles.googleButton,
              (!request || submitting) && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={styles.googleLabel}>Continue with Google</Text>
            )}
          </Pressable>

          {Platform.OS === "web" && !process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB && (
            <Text style={styles.hint}>
              Set EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB in .env to enable Google Sign-In.
            </Text>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    gap: spacing.xl,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: {
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorBox: {
    padding: spacing.md,
    backgroundColor: "#fef2f2",
    borderRadius: radius.md,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
  },
  googleButton: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  googleLabel: {
    color: colors.primaryText,
    fontWeight: "600",
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
  },
});
