import { QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Slot, useSegments } from "expo-router";
import { ActivityIndicator, StyleSheet } from "react-native";

import { PatternBackground } from "../components/PatternBackground";
import { AuthProvider, useAuth } from "../lib/auth/AuthProvider";
import { queryClient } from "../lib/query-client";

function LoadingScreen() {
  return (
    <PatternBackground style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#ED3C7B" />
    </PatternBackground>
  );
}

function NavigationGuard() {
  const { session, profile, isLoading } = useAuth();
  const segments = useSegments();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const inAuthGroup = segments[0] === "(auth)";
  const isAuthenticated = Boolean(session && profile);

  if (!isAuthenticated && !inAuthGroup) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (isAuthenticated && inAuthGroup) {
    return <Redirect href="/(tabs)" />;
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationGuard />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
