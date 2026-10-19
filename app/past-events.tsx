import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Avatar } from "../components/Avatar";
import { BackButton } from "../components/BackButton";
import { EmptyState } from "../components/EmptyState";
import { ScreenContainer } from "../components/ScreenContainer";
import { formatEventDateTime } from "../components/events/EventCard";
import { Colors } from "../constants/colors";
import { CardShadow } from "../constants/shadows";
import { useAuth } from "../lib/auth/AuthProvider";
import { supabase } from "../lib/supabase";
import type { Category, Profile } from "../lib/types";

// Manque produit identifié en écrivant .maestro/event-review.yaml (voir
// PROGRESS.md) : avant cet écran, le seul moyen d'atteindre le détail d'un
// événement déjà terminé (pour y laisser un avis a posteriori) était de
// taper sur une notification qui le référence (`event_reminder`/
// `event_update`) — impossible si cette notification n'existe plus.
type PastEventRow = {
  id: string;
  title: string;
  start_at: string;
  cover_image_url: string | null;
  category: Pick<Category, "id" | "name" | "emoji"> | null;
  channel:
    | {
        id: string;
        organizer_id: string;
        organizer: Pick<Profile, "id" | "first_name" | "last_name" | "avatar_url"> | null;
      }
    | null;
};

// `registration:event_registrations!inner(...)` transforme la relation en
// filtre (plutôt qu'une simple jointure optionnelle) : seuls les événements
// ayant au moins une ligne `event_registrations` correspondant aux `.eq()`
// ci-dessous (cette participante, statut confirmé) sont retournés. Combiné
// à `.lt("start_at", nowIso)` sur la colonne de `events` elle-même, la
// requête ne renvoie donc que des événements déjà passés où l'inscription
// de la participante est confirmée — jamais une inscription en attente/
// annulée, ni un événement à venir.
const PAST_EVENT_SELECT = `
  id,
  title,
  start_at,
  cover_image_url,
  category:categories(id, name, emoji),
  channel:channels(id, organizer_id, organizer:profiles!channels_organizer_id_fkey(id, first_name, last_name, avatar_url)),
  registration:event_registrations!inner(id, status, participant_id)
`;

function organizerName(row: PastEventRow): string {
  const organizer = row.channel?.organizer;
  if (!organizer) return "Organisatrice";
  return `${organizer.first_name} ${organizer.last_name}`.trim();
}

export default function PastEventsScreen() {
  const { profile } = useAuth();

  const [events, setEvents] = useState<PastEventRow[]>([]);
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPastEvents = useCallback(async () => {
    if (!profile?.id) return;
    setErrorMessage(null);

    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("events")
      .select(PAST_EVENT_SELECT)
      .eq("registration.participant_id", profile.id)
      .eq("registration.status", "confirmed")
      .lt("start_at", nowIso)
      .order("start_at", { ascending: false });

    if (error) {
      console.error("[past-events] load failed:", JSON.stringify(error, null, 2));
      setErrorMessage(`Impossible de charger tes événements passés (${error.message}). Réessaie.`);
      return;
    }

    const rows = (data ?? []) as unknown as PastEventRow[];
    setEvents(rows);

    const eventIds = rows.map((row) => row.id);
    if (eventIds.length === 0) {
      setMyRatings({});
      return;
    }

    const { data: reviewRows } = await supabase
      .from("event_reviews")
      .select("event_id, rating")
      .eq("participant_id", profile.id)
      .in("event_id", eventIds);

    const ratings: Record<string, number> = {};
    ((reviewRows ?? []) as { event_id: string; rating: number }[]).forEach((row) => {
      ratings[row.event_id] = row.rating;
    });
    setMyRatings(ratings);
  }, [profile?.id]);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      setIsLoading(true);
      await loadPastEvents();
      if (isMounted) setIsLoading(false);
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [loadPastEvents]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadPastEvents();
    setIsRefreshing(false);
  }, [loadPastEvents]);

  return (
    <ScreenContainer>
      <BackButton style={styles.backButton} />
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Mes événements passés</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : errorMessage ? (
        <Text style={styles.error}>{errorMessage}</Text>
      ) : (
        <FlatList
          testID="list-past-events"
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="time-outline"
              title="Aucun événement passé"
              subtitle="Les événements où ton inscription est confirmée apparaîtront ici une fois terminés, pour que tu puisses laisser un avis."
            />
          }
          renderItem={({ item }) => {
            const rating = myRatings[item.id];
            return (
              <TouchableOpacity
                testID={`row-past-event-${item.id}`}
                style={styles.row}
                onPress={() => router.push(`/event/${item.id}`)}
                activeOpacity={0.85}
              >
                {item.cover_image_url ? (
                  <Image source={{ uri: item.cover_image_url }} style={styles.cover} />
                ) : (
                  <View style={styles.coverPlaceholder}>
                    <Text style={styles.coverEmoji}>{item.category?.emoji ?? "🎉"}</Text>
                  </View>
                )}
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.organizerRow}>
                    <Avatar url={item.channel?.organizer?.avatar_url} name={organizerName(item)} size={18} />
                    <Text style={styles.organizerText} numberOfLines={1}>
                      {organizerName(item)}
                    </Text>
                  </View>
                  <Text style={styles.rowDate}>{formatEventDateTime(item.start_at)}</Text>
                  <Text style={styles.reviewHint} numberOfLines={1}>
                    {rating ? `${"⭐".repeat(rating)} Avis envoyé` : "Laisser un avis"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    marginLeft: 20,
    marginTop: 8,
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    paddingHorizontal: 20,
    fontSize: 14,
    color: Colors.danger,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    ...CardShadow,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  coverPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  coverEmoji: {
    fontSize: 22,
  },
  rowBody: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  organizerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  organizerText: {
    fontSize: 12,
    color: Colors.textMuted,
    flexShrink: 1,
  },
  rowDate: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textMuted,
  },
  reviewHint: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primaryDark,
  },
});
