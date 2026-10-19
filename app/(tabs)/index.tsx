import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Avatar } from "../../components/Avatar";
import { EmptyState } from "../../components/EmptyState";
import { EventCard, type EventWithDetails } from "../../components/events/EventCard";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Colors } from "../../constants/colors";
import { useAuth } from "../../lib/auth/AuthProvider";
import { supabase } from "../../lib/supabase";

const EVENT_SELECT = `
  *,
  confirmed_count:event_confirmed_count,
  category:categories(id, name, emoji, created_at),
  channel:channels(id, organizer_id, organizer:profiles!channels_organizer_id_fkey(id, first_name, last_name, avatar_url)),
  registrations:event_registrations(id, status, participant_id, participant:profiles(id, first_name, last_name, avatar_url))
`;

export default function AccueilScreen() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    if (!profile?.id) return;
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .is("read_at", null);
    setUnreadCount(count ?? 0);
  }, [profile?.id]);

  const loadEvents = useCallback(async () => {
    setErrorMessage(null);
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_SELECT)
      .eq("status", "published")
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true });

    if (error) {
      console.error("[events] load failed:", JSON.stringify(error, null, 2));
      setErrorMessage(`Impossible de charger les événements (${error.message}). Réessaie.`);
      return;
    }

    setEvents((data ?? []) as unknown as EventWithDetails[]);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      setIsLoading(true);
      await loadEvents();
      if (isMounted) {
        setIsLoading(false);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [loadEvents]);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadEvents();
    setIsRefreshing(false);
  }, [loadEvents]);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require("../../assets/images/logo.png")}
            style={styles.brandLogo}
          />
          <Text style={styles.headerTitle}>Sistrs</Text>
        </View>
        <View style={styles.headerActions}>
          {profile?.role === "organizer" ? (
            <TouchableOpacity
              testID="button-create-event"
              style={styles.iconButton}
              onPress={() => router.push("/event/create")}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={20} color={Colors.white} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            testID="button-notifications"
            style={styles.bellButton}
            onPress={() => router.push("/notifications")}
            activeOpacity={0.85}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(tabs)/profile")} activeOpacity={0.85}>
            <Avatar
              url={profile?.avatar_url}
              name={profile ? `${profile.first_name} ${profile.last_name}` : ""}
              size={32}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.trustBanner}>
        <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
        <Text style={styles.trustBannerText}>
          Communauté vérifiée : pièce d'identité à l'inscription, confirmation Face ID à chaque
          inscription à un événement.
        </Text>
      </View>

      {isLoading ? (
        <Text style={styles.helperText}>Chargement des événements…</Text>
      ) : errorMessage ? (
        <Text style={styles.error}>{errorMessage}</Text>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
          renderItem={({ item }) => (
            <EventCard event={item} onPress={() => router.push(`/event/${item.id}`)} />
          )}
          ListEmptyComponent={
            <EmptyState
              title="Aucun événement à venir"
              subtitle="Reviens plus tard ou suis des organisatrices pour ne rien manquer."
            />
          }
        />
      )}
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
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandLogo: {
    width: 30,
    height: 30,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.primary,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  bellButton: {
    padding: 2,
  },
  trustBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trustBannerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    lineHeight: 16,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexGrow: 1,
  },
  helperText: {
    paddingHorizontal: 20,
    fontSize: 14,
    color: Colors.textMuted,
  },
  error: {
    paddingHorizontal: 20,
    fontSize: 14,
    color: Colors.danger,
  },
});
