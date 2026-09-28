import { Stack } from "expo-router";

import { SignUpDraftProvider } from "./_signup-draft";

export default function AuthLayout() {
  return (
    <SignUpDraftProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SignUpDraftProvider>
  );
}
