import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { uploadImageAsync } from "../../lib/storage";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Avatar } from "../../components/Avatar";
import { AuthTextField } from "../../components/AuthTextField";
import { EmptyState } from "../../components/EmptyState";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Colors } from "../../constants/colors";
import { CardShadow, RaisedShadow } from "../../constants/shadows";
import { useAuth } from "../../lib/auth/AuthProvider";
import { supabase } from "../../lib/supabase";
import type { Category, UserStatus } from "../../lib/types";

// Couleurs de pastille par palier de statut — dérivées de la palette de
// marque (roses/ambre/gris neutres) pour rester dans les teintes de Colors
// tout en distinguant visuellement chaque palier.
const STATUS_META: Record<UserStatus, { label: string; dot: string }> = {
  commun: { label: "Commun", dot: Colors.textMuted },
  bronze: { label: "Bronze", dot: "#C0793D" },
  argent: { label: "Argent", dot: "#A6A0AA" },
  or: { label: "Or", dot: Colors.warning },
  diamant: { label: "Diamant", dot: Colors.primary },
};

type SpecialtyRow = {
  category_id: string;
  categories: Category | null;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, signOut, refreshProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");

  const [unreadCount, setUnreadCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isEditingCategories, setIsEditingCategories] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isSavingCategories, setIsSavingCategories] = useState(false);
  const MAX_PARTICIPANT_CATEGORIES = 5;

  useEffect(() => {
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
    setBio(profile?.bio ?? "");
  }, [profile?.first_name, profile?.last_name, profile?.bio]);

  const loadUnreadCount = useCallback(async () => {
    if (!profile?.id) return;
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .is("read_at", null);
    setUnreadCount(count ?? 0);
  }, [profile?.id]);

  const loadCategories = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoadingCategories(true);
    try {
      const table = profile.role === "organizer" ? "organizer_specialties" : "participant_preferences";
      const { data, error } = await supabase
        .from(table)
        .select("category_id, categories(id, name, emoji, created_at)")
        .eq("profile_id", profile.id);

      if (error) throw error;

      const rows = (data ?? []) as unknown as SpecialtyRow[];
      setCategories(rows.map((row) => row.categories).filter((c): c is Category => Boolean(c)));
    } catch {
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  }, [profile?.id, profile?.role]);

  useEffect(() => {
    loadUnreadCount();
    loadCategories();
  }, [loadUnreadCount, loadCategories]);

  useEffect(() => {
    let isMounted = true;
    supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (isMounted && data) setAllCategories(data as Category[]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (!profile) {
    return (
      <ScreenContainer>
        <EmptyState icon="person-circle-outline" title="Profil indisponible" subtitle="Reconnecte-toi pour voir ton profil." />
      </ScreenContainer>
    );
  }

  const statusMeta = STATUS_META[profile.status];
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Autorisation requise", "Autorise l'accès aux photos pour changer ton avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const uri = result.assets[0].uri;

    try {
      const avatarUrl = await uploadImageAsync(uri, "avatars", profile.id);
      const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", profile.id);

      if (error) {
        Alert.alert("Erreur", "Impossible de mettre à jour l'avatar.");
        return;
      }

      await refreshProfile();
    } catch {
      Alert.alert("Erreur", "Impossible d'envoyer la photo. Réessaie.");
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Champs requis", "Le prénom et le nom ne peuvent pas être vides.");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          bio: bio.trim() || null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      await refreshProfile();
      setIsEditing(false);
    } catch {
      Alert.alert("Erreur", "La sauvegarde du profil a échoué.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setFirstName(profile.first_name);
    setLastName(profile.last_name);
    setBio(profile.bio ?? "");
    setIsEditing(false);
  };

  const handleStartEditCategories = () => {
    setSelectedCategoryIds(categories.map((category) => category.id));
    setIsEditingCategories(true);
  };

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      if (profile.role === "participant" && prev.length >= MAX_PARTICIPANT_CATEGORIES) {
        Alert.alert("Maximum atteint", `Tu peux choisir jusqu'à ${MAX_PARTICIPANT_CATEGORIES} préférences.`);
        return prev;
      }
      return [...prev, categoryId];
    });
  };

  const handleCancelEditCategories = () => {
    setIsEditingCategories(false);
  };

  const handleSaveCategories = async () => {
    const table = profile.role === "organizer" ? "organizer_specialties" : "participant_preferences";
    setIsSavingCategories(true);
    try {
      const { error: deleteError } = await supabase.from(table).delete().eq("profile_id", profile.id);
      if (deleteError) throw deleteError;

      if (selectedCategoryIds.length > 0) {
        const rows = selectedCategoryIds.map((categoryId) => ({
          profile_id: profile.id,
          category_id: categoryId,
        }));
        const { error: insertError } = await supabase.from(table).insert(rows);
        if (insertError) throw insertError;
      }

      await loadCategories();
      setIsEditingCategories(false);
    } catch {
      Alert.alert("Erreur", `La sauvegarde des ${profile.role === "organizer" ? "spécialités" : "préférences"} a échoué.`);
    } finally {
      setIsSavingCategories(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Se déconnecter", "Es-tu sûre de vouloir te déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: () => signOut() },
    ]);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
        <TouchableOpacity style={styles.bellButton} onPress={() => router.push("/notifications")} activeOpacity={0.85}>
          <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarHalo}>
            <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8}>
              <Avatar url={profile.avatar_url} name={fullName} size={96} />
              <View style={styles.avatarEditBadge}>
                <Text style={styles.avatarEditIcon}>✎</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{fullName}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
              <Text style={styles.statChipText}>{statusMeta.label}</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="flash" size={13} color={Colors.primary} />
              <Text style={styles.statChipText}>{profile.activity_count} activité(s)</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          {isEditing ? (
            <>
              <AuthTextField label="Prénom" value={firstName} onChangeText={setFirstName} />
              <AuthTextField label="Nom" value={lastName} onChangeText={setLastName} />
              <AuthTextField
                label="Bio"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                style={styles.bioInput}
              />

              <View style={styles.editActionsRow}>
                <PrimaryButton
                  label="Annuler"
                  variant="outline"
                  onPress={handleCancelEdit}
                  style={styles.editActionButton}
                  disabled={isSaving}
                />
                <PrimaryButton
                  label="Enregistrer"
                  onPress={handleSave}
                  isLoading={isSaving}
                  style={styles.editActionButton}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>Bio</Text>
                <TouchableOpacity
                  style={styles.editIconButton}
                  onPress={() => setIsEditing(true)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="pencil" size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.bioText}>{profile.bio || "Aucune bio pour l'instant."}</Text>
            </>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>
              {profile.role === "organizer" ? "Spécialités" : "Préférences"}
            </Text>
            {!isEditingCategories ? (
              <TouchableOpacity
                style={styles.editIconButton}
                onPress={handleStartEditCategories}
                activeOpacity={0.75}
              >
                <Ionicons name="pencil" size={16} color={Colors.primary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {isEditingCategories ? (
            <>
              {profile.role === "participant" ? (
                <Text style={styles.helperText}>
                  Choisis jusqu'à {MAX_PARTICIPANT_CATEGORIES} catégories ({selectedCategoryIds.length}/{MAX_PARTICIPANT_CATEGORIES}).
                </Text>
              ) : null}
              <View style={styles.categoriesWrap}>
                {allCategories.map((category) => {
                  const isSelected = selectedCategoryIds.includes(category.id);
                  return (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => handleToggleCategory(category.id)}
                      style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                        {category.emoji ? `${category.emoji} ` : ""}
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.editActionsRow}>
                <PrimaryButton
                  label="Annuler"
                  variant="outline"
                  onPress={handleCancelEditCategories}
                  style={styles.editActionButton}
                  disabled={isSavingCategories}
                />
                <PrimaryButton
                  label="Enregistrer"
                  onPress={handleSaveCategories}
                  isLoading={isSavingCategories}
                  style={styles.editActionButton}
                />
              </View>
            </>
          ) : (
            <>
              {isLoadingCategories ? (
                <ActivityIndicator color={Colors.primary} />
              ) : categories.length === 0 ? (
                <Text style={styles.bioText}>
                  {profile.role === "organizer" ? "Aucune spécialité renseignée." : "Aucune préférence renseignée."}
                </Text>
              ) : (
                <View style={styles.categoriesWrap}>
                  {categories.map((category) => (
                    <View key={category.id} style={styles.categoryChip}>
                      <Text style={styles.categoryChipText}>
                        {category.emoji ? `${category.emoji} ` : ""}
                        {category.name}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        <PrimaryButton
          testID="button-sign-out"
          label="Se déconnecter"
          variant="outline"
          onPress={handleSignOut}
          style={styles.signOutButton}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
  },
  bellButton: {
    padding: 8,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  avatarHalo: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: Colors.accentBlue,
    alignItems: "center",
    justifyContent: "center",
    ...RaisedShadow,
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  avatarEditIcon: {
    color: Colors.white,
    fontSize: 13,
  },
  name: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    ...CardShadow,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  statChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    ...CardShadow,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  bioText: {
    fontSize: 15,
    color: Colors.text,
    marginBottom: 14,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  editActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  editActionButton: {
    flex: 1,
  },
  categoriesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryChipText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "600",
  },
  categoryChipSelected: {
    backgroundColor: Colors.primary,
  },
  categoryChipTextSelected: {
    color: Colors.white,
  },
  helperText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  signOutButton: {
    marginTop: 4,
  },
});
