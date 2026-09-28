import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors } from "../../constants/colors";
import type { Category, Event, EventRegistration, Profile } from "../../lib/types";
import { Avatar } from "../Avatar";

// Événement enrichi des jointures nécessaires à l'affichage (fil d'accueil
// et détail). Toutes les relations sont optionnelles côté type car elles
// dépendent des policies RLS (ex. `registrations` peut être une liste
// partielle selon qui interroge).
export type EventWithDetails = Event & {
  category: Pick<Category, "id" | "name" | "emoji"> | null;
  channel:
    | ({
        id: string;
        organizer_id: string;
        organizer: Pick<Profile, "id" | "first_name" | "last_name" | "avatar_url"> | null;
      } | null)
    | null;
  registrations: Pick<EventRegistration, "id" | "status" | "participant_id">[] | null;
};

export function organizerFullName(event: EventWithDetails): string {
  const organizer = event.channel?.organizer;
  if (!organizer) return "Organisatrice";
  return `${organizer.first_name} ${organizer.last_name}`.trim();
}

export function confirmedRegistrationsCount(
  registrations: Pick<EventRegistration, "status">[] | null | undefined
): number {
  if (!registrations) return 0;
  return registrations.filter((registration) => registration.status === "confirmed").length;
}

/** Formate une date ISO en "lundi 12 janvier · 19:30" (locale fr-FR). */
export function formatEventDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  const datePart = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timePart = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

type EventCardProps = {
  event: EventWithDetails;
  onPress: () => void;
};

export function EventCard({ event, onPress }: EventCardProps) {
  const confirmedCount = confirmedRegistrationsCount(event.registrations);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {event.cover_image_url ? (
        <Image source={{ uri: event.cover_image_url }} style={styles.cover} />
      ) : (
        <View style={styles.coverPlaceholder}>
          <Text style={styles.coverEmoji}>{event.category?.emoji ?? "🎉"}</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.meta}>{formatEventDateTime(event.start_at)}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          📍 {event.meeting_point}
        </Text>

        <View style={styles.footerRow}>
          <View style={styles.organizerRow}>
            <Avatar url={event.channel?.organizer?.avatar_url} name={organizerFullName(event)} size={24} />
            <Text style={styles.organizerName} numberOfLines={1}>
              {organizerFullName(event)}
            </Text>
          </View>
          <Text style={styles.spots}>
            {confirmedCount}/{event.max_participants}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cover: {
    height: 140,
    width: "100%",
    backgroundColor: Colors.primaryLight,
  },
  coverPlaceholder: {
    height: 90,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  coverEmoji: {
    fontSize: 32,
  },
  body: {
    padding: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 6,
  },
  meta: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  organizerRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  organizerName: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginLeft: 6,
    flexShrink: 1,
  },
  spots: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primaryDark,
  },
});
