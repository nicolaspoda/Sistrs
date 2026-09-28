import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BackButton } from "../components/BackButton";
import { EmptyState } from "../components/EmptyState";
import { ScreenContainer } from "../components/ScreenContainer";
import { Colors } from "../constants/colors";
import { useAuth } from "../lib/auth/AuthProvider";
import { supabase } from "../lib/supabase";
import type { Notification } from "../lib/types";

type ProfileNameMap = Record<string, string>;

function labelForNotification(notification: Notification, names: ProfileNameMap): string {
  const fromId = (notification.payload?.from_profile_id as string | undefined) ?? undefined;
  const fromName = fromId ? names[fromId] ?? "Quelqu'un" : "Quelqu'un";

  switch (notification.type) {
    case "friend_request":
      return `${fromName} vous a envoyé une demande d'amie`;
    case "friend_accepted":
      return `${fromName} a accepté votre demande`;
    case "new_message":
      return `Nouveau message de ${fromName}`;
    case "registration_confirmed":
      return "Inscription confirmée";
    case "poll_created":
      return "Nouveau sondage dans un canal que tu suis";
    case "event_reminder":
      return "Rappel : un événement approche";
    case "event_update":
      return "Un événement que tu suis a été mis à jour";
    case "new_follower":
      return `${fromName} s'est abonnée à ton canal`;
    case "new_post":
      return "Nouvelle publication dans un canal que tu suis";
    default:
      return "Nouvelle notification";
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [names, setNames] = useState<ProfileNameMap>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as Notification[];
      setNotifications(rows);

      const fromIds = Array.from(
        new Set(
          rows
            .map((n) => n.payload?.from_profile_id as string | undefined)
            .filter((value): value is string => Boolean(value))
        )
      );

      if (fromIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", fromIds);

        const map: ProfileNameMap = {};
        (profiles ?? []).forEach((p: { id: string; first_name: string; last_name: string }) => {
          map[p.id] = `${p.first_name} ${p.last_name}`.trim();
        });
        setNames(map);
      } else {
        setNames({});
      }
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handlePress = async (notification: Notification) => {
    if (!notification.read_at) {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notification.id);

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n))
        );
      }
    }

    const fromId = notification.payload?.from_profile_id as string | undefined;
    const channelId = notification.payload?.channel_id as string | undefined;
    const eventId = notification.payload?.event_id as string | undefined;

    switch (notification.type) {
      case "friend_request":
      case "friend_accepted":
      case "new_follower":
        if (fromId) router.push(`/profile/${fromId}`);
        break;
      case "new_message":
        if (fromId) router.push(`/conversation/${fromId}`);
        break;
      case "poll_created":
      case "new_post":
        if (channelId) router.push(`/channel/${channelId}`);
        break;
      case "registration_confirmed":
      case "event_reminder":
      case "event_update":
        if (eventId) router.push(`/event/${eventId}`);
        break;
      default:
        break;
    }
  };

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

  return (
    <ScreenContainer>
      <BackButton style={styles.backButton} />
      <Text style={styles.headerTitle}>Notifications</Text>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState title="Aucune notification" subtitle="Tu seras prévenue ici des nouveautés." />
        }
        renderItem={({ item }) => {
          const isUnread = !item.read_at;
          return (
            <TouchableOpacity
              style={[styles.row, isUnread && styles.rowUnread]}
              onPress={() => handlePress(item)}
              activeOpacity={0.75}
            >
              {isUnread ? <View style={styles.unreadDot} /> : <View style={styles.unreadDotPlaceholder} />}
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowLabel}>{labelForNotification(item, names)}</Text>
                <Text style={styles.rowDate}>
                  {new Date(item.created_at).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
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
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 10,
  },
  rowUnread: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryLight,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
    marginRight: 10,
  },
  unreadDotPlaceholder: {
    width: 8,
    height: 8,
    marginRight: 10,
  },
  rowTextContainer: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: "600",
  },
  rowDate: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textMuted,
  },
});
