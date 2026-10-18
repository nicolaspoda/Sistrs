import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors } from "../../constants/colors";
import { useAuth } from "../../lib/auth/AuthProvider";
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
  registrations:
    | (Pick<EventRegistration, "id" | "status" | "participant_id"> & {
        participant?: Pick<Profile, "id" | "first_name" | "last_name" | "avatar_url"> | null;
      })[]
    | null;
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

/** Formate une date ISO passée en "2h", "1j"... (style fil d'actualité). */
export function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j`;
}

/**
 * Pastille d'urgence affichée sur la photo de couverture, basée sur
 * `registration_deadline` (vraie donnée, contrairement à un badge
 * purement décoratif) : null quand l'échéance est encore loin, pour ne
 * pas surcharger le fil avec un badge sur tous les événements.
 */
export function formatRegistrationCountdown(deadlineIso: string): string | null {
  const diffMs = new Date(deadlineIso).getTime() - Date.now();
  if (diffMs <= 0) return "Inscriptions closes";
  const hours = diffMs / (1000 * 60 * 60);
  if (hours > 48) return null;
  if (hours < 1) return "Clôture dans moins d'1 h";
  if (hours < 24) return `Clôture dans ${Math.round(hours)} h`;
  return "Clôture demain";
}

type EventCardProps = {
  event: EventWithDetails;
  onPress: () => void;
};

export function EventCard({ event, onPress }: EventCardProps) {
  const { profile } = useAuth();
  const registrations = event.registrations ?? [];
  const confirmedRegistrations = registrations.filter((r) => r.status === "confirmed");
  const confirmedCount = confirmedRegistrations.length;
  const spotsLeft = Math.max(event.max_participants - confirmedCount, 0);
  const isFull = spotsLeft <= 0;
  const deadlinePassed = Date.now() >= new Date(event.registration_deadline).getTime();
  const isOrganizer = Boolean(profile && profile.id === event.organizer_id);
  const isRegistered = Boolean(
    profile && confirmedRegistrations.some((r) => r.participant_id === profile.id)
  );
  const countdown = formatRegistrationCountdown(event.registration_deadline);
  const stackedParticipants = confirmedRegistrations.slice(0, 4);
  const extraParticipantsCount = Math.max(confirmedCount - stackedParticipants.length, 0);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.95}>
      <View style={styles.organizerRow}>
        <Avatar url={event.channel?.organizer?.avatar_url} name={organizerFullName(event)} size={36} />
        <View style={styles.organizerTextBlock}>
          <Text style={styles.organizerName} numberOfLines={1}>
            {organizerFullName(event)}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.meta} numberOfLines={1}>
              {event.meeting_point}
            </Text>
          </View>
        </View>
        <Text style={styles.timeAgo}>{formatRelativeTime(event.created_at)}</Text>
      </View>

      <View style={styles.coverWrapper}>
        {event.cover_image_url ? (
          <Image source={{ uri: event.cover_image_url }} style={styles.cover} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverEmoji}>{event.category?.emoji ?? "🎉"}</Text>
          </View>
        )}
        {event.category ? (
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>
              {event.category.emoji} {event.category.name}
            </Text>
          </View>
        ) : null}
        {countdown ? (
          <View style={styles.countdownTag}>
            <Text style={styles.countdownTagText}>{countdown}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {event.description}
        </Text>
        <Text style={styles.dateLine}>{formatEventDateTime(event.start_at)}</Text>

        <View style={styles.participantsRow}>
          <View style={styles.avatarStack}>
            {stackedParticipants.map((registration, index) => (
              <View
                key={registration.id}
                style={[styles.avatarStackItem, index > 0 && styles.avatarStackItemOverlap]}
              >
                <Avatar
                  url={registration.participant?.avatar_url}
                  name={
                    registration.participant
                      ? `${registration.participant.first_name} ${registration.participant.last_name}`
                      : "Participante"
                  }
                  size={28}
                />
              </View>
            ))}
            {extraParticipantsCount > 0 ? (
              <View style={[styles.avatarStackItem, styles.avatarStackItemOverlap, styles.avatarStackMore]}>
                <Text style={styles.avatarStackMoreText}>+{extraParticipantsCount}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.spots}>
            {confirmedCount}/{event.max_participants} participantes
            {!isFull && !deadlinePassed ? ` · Plus que ${spotsLeft} place${spotsLeft > 1 ? "s" : ""}` : ""}
          </Text>
        </View>

        {!isOrganizer ? (
          <TouchableOpacity
            style={[
              styles.ctaButton,
              (isRegistered || isFull || deadlinePassed) && styles.ctaButtonSecondary,
            ]}
            onPress={onPress}
            activeOpacity={0.88}
          >
            <Ionicons
              name={isRegistered ? "checkmark-circle" : "scan-outline"}
              size={18}
              color={isRegistered || isFull || deadlinePassed ? Colors.primary : Colors.white}
            />
            <Text
              style={[
                styles.ctaButtonText,
                (isRegistered || isFull || deadlinePassed) && styles.ctaButtonTextSecondary,
              ]}
            >
              {isRegistered
                ? "Tu es inscrite ✓"
                : isFull
                  ? "Événement complet"
                  : deadlinePassed
                    ? "Inscriptions closes"
                    : "S'inscrire avec Face ID"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  coverWrapper: {
    position: "relative",
  },
  cover: {
    height: 180,
    width: "100%",
    backgroundColor: Colors.primaryLight,
  },
  coverPlaceholder: {
    height: 120,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  coverEmoji: {
    fontSize: 36,
  },
  categoryTag: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(26,20,32,0.55)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryTagText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  countdownTag: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  countdownTagText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  organizerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  organizerTextBlock: {
    flex: 1,
    marginLeft: 10,
  },
  organizerName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 1,
  },
  meta: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  timeAgo: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: Colors.text,
    marginBottom: 6,
    lineHeight: 18,
  },
  dateLine: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primaryDark,
    marginBottom: 12,
  },
  participantsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  avatarStackItem: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  avatarStackItemOverlap: {
    marginLeft: -10,
  },
  avatarStackMore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarStackMoreText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  spots: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    flexShrink: 1,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  ctaButtonSecondary: {
    backgroundColor: Colors.primaryLight,
  },
  ctaButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  ctaButtonTextSecondary: {
    color: Colors.primary,
  },
});
