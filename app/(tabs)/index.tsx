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
  channel:channels(id, organizer_id, organizer:profiles(id, first_name, last_name, avatar_url)),
  registrations:event_registrations(id, status, participant_id)
`;

export default function AccueilScreen() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setErrorMessage(null);
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_SELECT)
      .eq("status", "published")
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true });

    if (error) {
      setErrorMessage("Impossible de charger les événements. Réessaie.");
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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadEvents();
    setIsRefreshing(false);
  }, [loadEvents]);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Accueil</Text>
        {profile?.role === "organizer" ? (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push("/event/create")}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color={Colors.white} />
            <Text style={styles.createButtonLabel}>Créer un événement</Text>
          </TouchableOpacity>
        ) : null}
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: 12,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
  },
  createButtonLabel: {
    color: Colors.white,
    fontSize: 15,
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
