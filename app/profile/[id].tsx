import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "../../components/Avatar";
import { BackButton } from "../../components/BackButton";
import { EmptyState } from "../../components/EmptyState";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Colors } from "../../constants/colors";
import { supabase } from "../../lib/supabase";
import type { Category, Profile, UserStatus } from "../../lib/types";

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

export default function OtherProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [channelId, setChannelId] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      setProfile((data as Profile | null) ?? null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const loadCategories = useCallback(async (role: Profile["role"]) => {
    if (!id) return;
    const table = role === "organizer" ? "organizer_specialties" : "participant_preferences";
    const { data, error } = await supabase
      .from(table)
      .select("category_id, categories(id, name, emoji, created_at)")
      .eq("profile_id", id);

    if (error) {
      setCategories([]);
      return;
    }

    const rows = (data ?? []) as unknown as SpecialtyRow[];
    setCategories(rows.map((row) => row.categories).filter((c): c is Category => Boolean(c)));
  }, [id]);

  const loadChannel = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from("channels").select("id").eq("organizer_id", id).maybeSingle();
    setChannelId(data?.id ?? null);
  }, [id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!profile) return;
    loadCategories(profile.role);
    if (profile.role === "organizer") {
      loadChannel();
    }
  }, [profile, loadCategories, loadChannel]);

  if (isLoading) {
    return (
      <ScreenContainer>
        <BackButton style={styles.backButton} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!profile) {
    return (
      <ScreenContainer>
        <BackButton style={styles.backButton} />
        <EmptyState title="Profil introuvable" subtitle="Cette personne n'existe pas ou plus." />
      </ScreenContainer>
    );
  }

  const statusMeta = STATUS_META[profile.status];
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <BackButton style={styles.backButton} />
        <View style={styles.avatarSection}>
          <Avatar url={profile.avatar_url} name={fullName} size={96} />
          <Text style={styles.name}>{fullName}</Text>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
            <Text style={styles.statusLabel}>{statusMeta.label}</Text>
          </View>

          <Text style={styles.activityCount}>{profile.activity_count} activité(s)</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Bio</Text>
          <Text style={styles.bioText}>{profile.bio || "Aucune bio pour l'instant."}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>
            {profile.role === "organizer" ? "Spécialités" : "Préférences"}
          </Text>
          {categories.length === 0 ? (
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

        {profile.role === "organizer" && channelId ? (
          <PrimaryButton
            label="Voir son canal"
            variant="outline"
            onPress={() => router.push(`/channel/${channelId}`)}
            style={styles.actionButton}
          />
        ) : null}

        <PrimaryButton
          label="Envoyer un message"
          onPress={() => router.push(`/conversation/${id}`)}
          style={styles.actionButton}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    marginLeft: 20,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 20,
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
  actionButton: {
    marginTop: 4,
    marginBottom: 12,
  },
});
