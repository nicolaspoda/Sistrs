import { useCallback, useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
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

  if (!profile) {
    return (
      <ScreenContainer>
        <EmptyState title="Profil indisponible" subtitle="Reconnecte-toi pour voir ton profil." />
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

    // TODO: upload vers Supabase Storage — pour l'instant on stocke juste
    // l'URI locale de l'image choisie, sans upload réel.
    const { error } = await supabase.from("profiles").update({ avatar_url: uri }).eq("id", profile.id);

    if (error) {
      Alert.alert("Erreur", "Impossible de mettre à jour l'avatar.");
      return;
    }

    await refreshProfile();
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
        <TouchableOpacity style={styles.bellButton} onPress={() => router.push("/notifications")}>
          <Text style={styles.bellIcon}>🔔</Text>
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8}>
            <Avatar url={profile.avatar_url} name={fullName} size={96} />
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditIcon}>✎</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>{fullName}</Text>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
            <Text style={styles.statusLabel}>{statusMeta.label}</Text>
          </View>

          <Text style={styles.activityCount}>{profile.activity_count} activité(s)</Text>
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
              <Text style={styles.sectionLabel}>Bio</Text>
              <Text style={styles.bioText}>{profile.bio || "Aucune bio pour l'instant."}</Text>
              <PrimaryButton label="Modifier" variant="outline" onPress={() => setIsEditing(true)} />
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>
            {profile.role === "organizer" ? "Spécialités" : "Préférences"}
          </Text>
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
        </View>

        <PrimaryButton
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
  bellIcon: {
    fontSize: 22,
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
    borderColor: Colors.background,
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
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  activityCount: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textMuted,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
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
  signOutButton: {
    marginTop: 4,
  },
});
