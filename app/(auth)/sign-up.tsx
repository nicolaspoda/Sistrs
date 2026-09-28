import * as ImagePicker from "expo-image-picker";
import { Link, router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AuthTextField } from "../../components/AuthTextField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Colors } from "../../constants/colors";
import type { UserRole } from "../../lib/types";
import { useSignUpDraft } from "./_signup-draft";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "participant", label: "Participante" },
  { value: "organizer", label: "Organisatrice" },
];

export default function SignUpScreen() {
  const { draft, updateDraft } = useSignUpDraft();

  const [firstName, setFirstName] = useState(draft.firstName);
  const [lastName, setLastName] = useState(draft.lastName);
  const [birthDate, setBirthDate] = useState(draft.birthDate);
  const [email, setEmail] = useState(draft.email);
  const [password, setPassword] = useState(draft.password);
  const [gender, setGender] = useState(draft.gender);
  const [role, setRole] = useState<UserRole>(draft.role);
  const [idDocumentUri, setIdDocumentUri] = useState<string | null>(draft.idDocumentUri);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePickIdDocument = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage("Autorise l'accès à tes photos pour ajouter une pièce d'identité.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      // TODO: upload vers Supabase Storage — pour l'instant on garde juste
      // l'URI locale dans le draft, elle n'est pas persistée côté serveur.
      setIdDocumentUri(result.assets[0].uri);
    }
  };

  const handleContinue = () => {
    if (!firstName.trim() || !lastName.trim() || !birthDate.trim() || !email.trim() || !password) {
      setErrorMessage("Merci de remplir tous les champs obligatoires.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setErrorMessage(null);
    updateDraft({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: birthDate.trim(),
      email: email.trim(),
      password,
      gender: gender.trim(),
      role,
      idDocumentUri,
    });
    router.push("/(auth)/sign-up-preferences");
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Étape 1 sur 2 — tes informations</Text>

        <View style={styles.row}>
          <AuthTextField
            label="Prénom"
            placeholder="Léa"
            autoCapitalize="words"
            value={firstName}
            onChangeText={setFirstName}
            style={styles.rowInput}
          />
          <AuthTextField
            label="Nom"
            placeholder="Martin"
            autoCapitalize="words"
            value={lastName}
            onChangeText={setLastName}
            style={styles.rowInput}
          />
        </View>

        <AuthTextField
          label="Date de naissance (JJ/MM/AAAA)"
          placeholder="14/03/1998"
          value={birthDate}
          onChangeText={setBirthDate}
          keyboardType="numbers-and-punctuation"
        />

        <AuthTextField
          label="Email"
          placeholder="ton@email.com"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />

        <AuthTextField
          label="Mot de passe"
          placeholder="6 caractères minimum"
          secureTextEntry
          autoComplete="password-new"
          value={password}
          onChangeText={setPassword}
        />

        <AuthTextField
          label="Genre"
          placeholder="femme"
          autoCapitalize="none"
          value={gender}
          onChangeText={setGender}
        />

        <Text style={styles.sectionLabel}>Tu es plutôt…</Text>
        <View style={styles.segmentRow}>
          {ROLE_OPTIONS.map((option) => {
            const isSelected = role === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.segment, isSelected && styles.segmentSelected]}
                onPress={() => setRole(option.value)}
                activeOpacity={0.85}
              >
                <Text style={[styles.segmentLabel, isSelected && styles.segmentLabelSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Pièce d'identité (optionnel)</Text>
        <PrimaryButton
          label={idDocumentUri ? "Pièce d'identité ajoutée ✓" : "Ajouter une pièce d'identité"}
          variant="outline"
          onPress={handlePickIdDocument}
          style={styles.idButton}
        />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <PrimaryButton label="Continuer" onPress={handleContinue} style={styles.submitButton} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà un compte ?</Text>
          <Link href="/(auth)/sign-in" style={styles.footerLink}>
            Se connecter
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowInput: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 10,
    marginTop: 4,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  segment: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  segmentSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  segmentLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  segmentLabelSelected: {
    color: Colors.primaryDark,
  },
  idButton: {
    marginBottom: 20,
  },
  error: {
    color: Colors.danger,
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  submitButton: {
    marginTop: 4,
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
