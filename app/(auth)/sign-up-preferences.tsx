import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { Colors } from "../../constants/colors";
import { useAuth } from "../../lib/auth/AuthProvider";
import { supabase } from "../../lib/supabase";
import type { AgeBracket, Category } from "../../lib/types";
import { useSignUpDraft } from "./_signup-draft";

const AGE_BRACKETS: AgeBracket[] = ["18-25", "26-30", "30+"];
const MAX_PARTICIPANT_CATEGORIES = 5;

export default function SignUpPreferencesScreen() {
  const { draft, updateDraft, resetDraft } = useSignUpDraft();
  const { signUp } = useAuth();

  const isParticipant = draft.role === "participant";

  const [ageBracket, setAgeBracket] = useState<AgeBracket | null>(draft.ageBracket);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(draft.categoryIds);
  const [faceIdEnabled, setFaceIdEnabled] = useState(draft.faceIdEnabled);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      const { data, error } = await supabase.from("categories").select("*");
      if (!isMounted) return;
      if (!error && data) {
        setCategories(data as Category[]);
      }
      setIsLoadingCategories(false);
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      if (isParticipant && prev.length >= MAX_PARTICIPANT_CATEGORIES) {
        return prev;
      }
      return [...prev, categoryId];
    });
  };

  const handleEnableFaceId = async () => {
    setErrorMessage(null);
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      setErrorMessage("Face ID / Touch ID n'est pas disponible sur cet appareil.");
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirme ton identité pour activer Face ID",
    });

    if (result.success) {
      setFaceIdEnabled(true);
    } else {
      setErrorMessage("Activation de Face ID annulée ou échouée.");
    }
  };

  const handleCreateAccount = async () => {
    if (!ageBracket) {
      setErrorMessage("Choisis ta tranche d'âge.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      updateDraft({ ageBracket, categoryIds: selectedCategoryIds, faceIdEnabled });

      await signUp(draft.email, draft.password, {
        first_name: draft.firstName,
        last_name: draft.lastName,
        birth_date: draft.birthDate,
        gender: draft.gender,
        age_bracket: ageBracket,
        role: draft.role,
        id_document_url: draft.idDocumentUri ?? undefined,
        face_id_enabled: faceIdEnabled,
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id && selectedCategoryIds.length > 0) {
        const table = isParticipant ? "participant_preferences" : "organizer_specialties";
        const rows = selectedCategoryIds.map((categoryId) => ({
          profile_id: user.id,
          category_id: categoryId,
        }));
        const { error: insertError } = await supabase.from(table).insert(rows);
        if (insertError) {
          throw insertError;
        }
      }

      resetDraft();
      router.replace("/(tabs)");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossible de créer le compte. Réessaie."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Créer un compte</Text>
      <Text style={styles.subtitle}>Étape 2 sur 2 — tes préférences</Text>

      <Text style={styles.sectionLabel}>Tranche d'âge</Text>
      <View style={styles.segmentRow}>
        {AGE_BRACKETS.map((bracket) => {
          const isSelected = ageBracket === bracket;
          return (
            <TouchableOpacity
              key={bracket}
              style={[styles.segment, isSelected && styles.segmentSelected]}
              onPress={() => setAgeBracket(bracket)}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentLabel, isSelected && styles.segmentLabelSelected]}>
                {bracket}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>
        {isParticipant ? `Catégories préférées (max ${MAX_PARTICIPANT_CATEGORIES})` : "Tes spécialités"}
      </Text>
      {isLoadingCategories ? (
        <Text style={styles.helperText}>Chargement des catégories…</Text>
      ) : categories.length === 0 ? (
        <Text style={styles.helperText}>Aucune catégorie disponible pour le moment.</Text>
      ) : (
        <View style={styles.chipsWrap}>
          {categories.map((category) => {
            const isSelected = selectedCategoryIds.includes(category.id);
            const isDisabled =
              isParticipant && !isSelected && selectedCategoryIds.length >= MAX_PARTICIPANT_CATEGORIES;
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.chip, isSelected && styles.chipSelected, isDisabled && styles.chipDisabled]}
                onPress={() => toggleCategory(category.id)}
                disabled={isDisabled}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                  {category.emoji ? `${category.emoji} ` : ""}
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Text style={styles.sectionLabel}>Sécurité</Text>
      <PrimaryButton
        label={faceIdEnabled ? "Face ID activé ✓" : "Activer Face ID"}
        variant="outline"
        onPress={handleEnableFaceId}
        style={styles.faceIdButton}
      />

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <PrimaryButton
        label="Créer mon compte"
        onPress={handleCreateAccount}
        isLoading={isSubmitting}
        style={styles.submitButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    backgroundColor: Colors.background,
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
  helperText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 20,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  chipLabelSelected: {
    color: Colors.primaryDark,
  },
  faceIdButton: {
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
});
