import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { EmptyState } from "../../components/EmptyState";
import { EventCard, type EventWithDetails } from "../../components/events/EventCard";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Colors } from "../../constants/colors";
import { useAuth } from "../../lib/auth/AuthProvider";
import { supabase } from "../../lib/supabase";

const EVENT_SELECT = `
  *,
  category:categories(id, name, emoji, created_at),
  channel:channels(id, organizer_id, organizer:profiles!channels_organizer_id_fkey(id, first_name, last_name, avatar_url)),
  registrations:event_registrations(id, status, participant_id)
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
        <View style={styles.headerSide}>
          {profile?.role === "organizer" ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push("/event/create")}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={22} color={Colors.white} />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.headerTitle}>Accueil</Text>
        <View style={[styles.headerSide, styles.headerSideRight]}>
          <TouchableOpacity style={styles.bellButton} onPress={() => router.push("/notifications")} activeOpacity={0.85}>
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
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
  headerSide: {
    width: 40,
    alignItems: "flex-start",
  },
  headerSideRight: {
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.primary,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  bellButton: {
    padding: 4,
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
