import * as ImagePicker from "expo-image-picker";
import { Link, router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AuthTextField } from "../../components/AuthTextField";
import { DatePickerField } from "../../components/DatePickerField";
import { PasswordField } from "../../components/PasswordField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Colors } from "../../constants/colors";
import type { UserRole } from "../../lib/types";
import { useSignUpDraft } from "./_signup-draft";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "participant", label: "Participante" },
  { value: "organizer", label: "Organisatrice" },
];

// Genre : jamais demandé en usage normal (voir CLAUDE.md — filtre "femmes
// uniquement"). En dev/staging uniquement, un lien discret révèle un
// sélecteur pour permettre au développeur de tester avec un autre genre.
const DEV_GENDER_OPTIONS = ["femme", "homme", "autre"];
const isProduction = process.env.EXPO_PUBLIC_ENV === "production";

const MIN_PASSWORD_LENGTH = 8;

// Date pré-sélectionnée à l'ouverture du calendrier de naissance quand le
// champ est encore vide : 25 ans en arrière est un point de départ
// plausible et laisse de la marge dans les deux sens (mois précédents ET
// suivants) avant de toucher `maximumDate` (aujourd'hui).
function eighteenPlusDefaultDate(): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 25);
  return date;
}

type FieldErrors = {
  firstName: boolean;
  lastName: boolean;
  birthDate: boolean;
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
  idDocument: boolean;
};

const NO_FIELD_ERRORS: FieldErrors = {
  firstName: false,
  lastName: false,
  birthDate: false,
  email: false,
  password: false,
  confirmPassword: false,
  idDocument: false,
};

export default function SignUpScreen() {
  const { draft, updateDraft } = useSignUpDraft();

  const [firstName, setFirstName] = useState(draft.firstName);
  const [lastName, setLastName] = useState(draft.lastName);
  const [birthDate, setBirthDate] = useState(draft.birthDate);
  const [email, setEmail] = useState(draft.email);
  const [password, setPassword] = useState(draft.password);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState(draft.gender || "femme");
  const [isDevGenderVisible, setIsDevGenderVisible] = useState(false);
  const [role, setRole] = useState<UserRole>(draft.role);
  const [idDocumentUri, setIdDocumentUri] = useState<string | null>(draft.idDocumentUri);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(NO_FIELD_ERRORS);

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
    const nextFieldErrors: FieldErrors = {
      firstName: !firstName.trim(),
      lastName: !lastName.trim(),
      birthDate: !birthDate.trim(),
      email: !email.trim(),
      password: !password || password.length < MIN_PASSWORD_LENGTH,
      confirmPassword: !password || password !== confirmPassword,
      idDocument: !idDocumentUri,
    };
    const hasAnyError = Object.values(nextFieldErrors).some(Boolean);

    if (hasAnyError) {
      setFieldErrors(nextFieldErrors);
      if (!firstName.trim() || !lastName.trim() || !birthDate.trim() || !email.trim() || !password) {
        setErrorMessage("Vérifie les champs en rouge ci-dessous.");
      } else if (password.length < MIN_PASSWORD_LENGTH) {
        setErrorMessage(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      } else if (password !== confirmPassword) {
        setErrorMessage("Les deux mots de passe ne correspondent pas.");
      } else if (!idDocumentUri) {
        setErrorMessage("La pièce d'identité est obligatoire pour créer un compte.");
      }
      return;
    }

    setFieldErrors(NO_FIELD_ERRORS);
    setErrorMessage(null);
    updateDraft({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: birthDate.trim(),
      email: email.trim(),
      password,
      // Genre toujours "femme" en production, quoi qu'il arrive — le
      // sélecteur développeur n'existe même pas dans ce cas (voir plus bas).
      gender: isProduction ? "femme" : gender.trim() || "femme",
      role,
      idDocumentUri,
    });
    router.push("/(auth)/sign-up-preferences");
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.overline}>ÉTAPE 1 SUR 2</Text>
        <Text style={styles.stepTitle}>Tes informations</Text>

        <AuthTextField
          label="Prénom"
          placeholder="Léa"
          autoCapitalize="words"
          value={firstName}
          onChangeText={setFirstName}
          hasError={fieldErrors.firstName}
        />

        <AuthTextField
          label="Nom"
          placeholder="Martin"
          autoCapitalize="words"
          value={lastName}
          onChangeText={setLastName}
          hasError={fieldErrors.lastName}
        />

        <DatePickerField
          label="Date de naissance"
          value={birthDate}
          onChange={setBirthDate}
          hasError={fieldErrors.birthDate}
          maximumDate={new Date()}
          defaultDate={eighteenPlusDefaultDate()}
        />

        <AuthTextField
          label="Email"
          placeholder="ton@email.com"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          hasError={fieldErrors.email}
        />

        <PasswordField
          label="Mot de passe"
          placeholder={`${MIN_PASSWORD_LENGTH} caractères minimum`}
          autoComplete="password-new"
          value={password}
          onChangeText={setPassword}
          hasError={fieldErrors.password}
        />

        <PasswordField
          label="Confirmer le mot de passe"
          placeholder="Retape ton mot de passe"
          autoComplete="password-new"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          hasError={fieldErrors.confirmPassword}
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

        <Text style={styles.sectionLabel}>Pièce d'identité (obligatoire)</Text>
        <PrimaryButton
          label={idDocumentUri ? "Pièce d'identité ajoutée ✓" : "Ajouter une pièce d'identité"}
          variant="outline"
          onPress={handlePickIdDocument}
          style={[styles.idButton, fieldErrors.idDocument && styles.idButtonError]}
        />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <PrimaryButton
          label="Continuer"
          onPress={handleContinue}
          disabled={!idDocumentUri}
          style={styles.submitButton}
        />

        {!isProduction ? (
          <View style={styles.devSection}>
            <TouchableOpacity onPress={() => setIsDevGenderVisible((prev) => !prev)}>
              <Text style={styles.devLink}>Mode développeur : changer le genre pour un test</Text>
            </TouchableOpacity>
            {isDevGenderVisible ? (
              <View style={styles.devGenderRow}>
                {DEV_GENDER_OPTIONS.map((option) => {
                  const isSelected = gender === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.devGenderChip, isSelected && styles.devGenderChipSelected]}
                      onPress={() => setGender(option)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[styles.devGenderChipLabel, isSelected && styles.devGenderChipLabelSelected]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

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
    marginBottom: 16,
  },
  overline: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 24,
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
  idButtonError: {
    borderColor: Colors.danger,
    borderWidth: 1.5,
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
  devSection: {
    marginTop: 24,
    alignItems: "center",
  },
  devLink: {
    fontSize: 12,
    color: Colors.textMuted,
    textDecorationLine: "underline",
  },
  devGenderRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  devGenderChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  devGenderChipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  devGenderChipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  devGenderChipLabelSelected: {
    color: Colors.primaryDark,
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
