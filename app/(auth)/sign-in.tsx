import { Link, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { AuthTextField } from "../../components/AuthTextField";
import { PatternBackground } from "../../components/PatternBackground";
import { PasswordField } from "../../components/PasswordField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Colors } from "../../constants/colors";
import { useAuth } from "../../lib/auth/AuthProvider";
import { translateAuthError } from "../../lib/auth-errors";

export default function SignInScreen() {
  const { signIn } = useAuth();
  const { justSignedUp } = useLocalSearchParams<{ justSignedUp?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setErrorMessage("Merci de renseigner ton email et ton mot de passe.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (error) {
      setErrorMessage(translateAuthError(error instanceof Error ? error.message : undefined));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PatternBackground style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.keyboardFlex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
        />
        <Text style={styles.title}>Sistrs</Text>
        <Text style={styles.subtitle}>Connecte-toi pour retrouver tes sorties entre filles.</Text>

        {justSignedUp === "1" ? (
          <Text style={styles.successBanner}>
            Compte créé avec succès ! Connecte-toi pour continuer.
          </Text>
        ) : null}

        <AuthTextField
          testID="input-email"
          label="Email"
          placeholder="ton@email.com"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <PasswordField
          testID="input-password"
          label="Mot de passe"
          placeholder="••••••••"
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <PrimaryButton
          testID="button-sign-in"
          label="Se connecter"
          onPress={handleSubmit}
          isLoading={isSubmitting}
          style={styles.submitButton}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ?</Text>
          <Link href="/(auth)/sign-up" style={styles.footerLink}>
            S'inscrire
          </Link>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </PatternBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  keyboardFlex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 22,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 32,
  },
  error: {
    color: Colors.danger,
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  successBanner: {
    color: Colors.success,
    backgroundColor: Colors.primaryLight,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  submitButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 24,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  footerLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});
