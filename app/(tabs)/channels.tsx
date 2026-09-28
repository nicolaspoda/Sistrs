import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Avatar } from "../../components/Avatar";
import { EmptyState } from "../../components/EmptyState";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Colors } from "../../constants/colors";
import { useAuth } from "../../lib/auth/AuthProvider";
import { supabase } from "../../lib/supabase";
import type { Profile } from "../../lib/types";

type ChannelRow = {
  id: string;
  organizer_id: string;
  name: string;
  description: string | null;
  organizer: Profile | null;
  isSubscribed: boolean;
  hasNewContent: boolean;
};

export default function ChannelsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingChannelId, setPendingChannelId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadChannels = useCallback(async () => {
    if (!profile) return;
    setErrorMessage(null);

    // On ne liste ici que les canaux suivis : la découverte de nouveaux
    // canaux se fait via les publications des organisatrices (fil
    // d'accueil / profils), pas par une liste "Découvrir" à parcourir.
    const { data: subscriptionsData, error: subscriptionsError } = await supabase
      .from("channel_subscriptions")
      .select("channel_id, last_viewed_at, channel:channels(id, organizer_id, name, description, organizer:profiles!channels_organizer_id_fkey(*))")
      .eq("subscriber_id", profile.id);

    if (subscriptionsError) {
      setErrorMessage("Impossible de charger les canaux.");
      return;
    }

    const subscriptions = subscriptionsData ?? [];
    const channelIds = subscriptions.map((row: any) => row.channel_id as string);
    const lastViewedByChannel = new Map(
      subscriptions.map((row: any) => [row.channel_id as string, row.last_viewed_at as string | null])
    );

    let newContentChannelIds = new Set<string>();
    if (channelIds.length > 0) {
      const [{ data: postsData }, { data: pollsData }] = await Promise.all([
        supabase.from("channel_posts").select("channel_id, created_at").in("channel_id", channelIds),
        supabase.from("polls").select("channel_id, created_at").in("channel_id", channelIds),
      ]);

      const items = [...(postsData ?? []), ...(pollsData ?? [])];
      newContentChannelIds = new Set(
        items
          .filter((item: any) => {
            const lastViewedAt = lastViewedByChannel.get(item.channel_id);
            return !lastViewedAt || new Date(item.created_at) > new Date(lastViewedAt);
          })
          .map((item: any) => item.channel_id as string)
      );
    }

    const rows: ChannelRow[] = subscriptions
      .filter((row: any) => row.channel)
      .map((row: any) => ({
        id: row.channel.id,
        organizer_id: row.channel.organizer_id,
        name: row.channel.name,
        description: row.channel.description,
        organizer: (row.channel.organizer as Profile | null) ?? null,
        isSubscribed: true,
        hasNewContent: newContentChannelIds.has(row.channel.id),
      }));

    setChannels(rows);
  }, [profile]);

  useEffect(() => {
    setIsLoading(true);
    loadChannels().finally(() => setIsLoading(false));
  }, [loadChannels]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadChannels();
    setIsRefreshing(false);
  }, [loadChannels]);

  const unfollowChannel = useCallback(
    async (channel: ChannelRow) => {
      if (!profile || pendingChannelId) return;

      setPendingChannelId(channel.id);
      // Un canal n'apparaît ici que parce qu'il est suivi : se désabonner
      // le retire directement de la liste.
      setChannels((prev) => prev.filter((row) => row.id !== channel.id));

      const { error } = await supabase
        .from("channel_subscriptions")
        .delete()
        .eq("channel_id", channel.id)
        .eq("subscriber_id", profile.id);

      if (error) {
        setChannels((prev) => (prev.some((row) => row.id === channel.id) ? prev : [...prev, channel]));
      }

      setPendingChannelId(null);
    },
    [profile, pendingChannelId]
  );

  const followedChannels = channels;

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <Text style={styles.screenTitle}>Canaux</Text>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {followedChannels.length === 0 ? (
          <EmptyState
            title="Aucun canal suivi"
            subtitle="Abonne-toi au canal d'une organisatrice depuis une de ses publications ou son profil pour le retrouver ici."
          />
        ) : (
          followedChannels.map((channel) => (
            <ChannelListItem
              key={channel.id}
              channel={channel}
              isPending={pendingChannelId === channel.id}
              onPress={() => router.push(`/channel/${channel.id}`)}
              onToggleSubscription={() => unfollowChannel(channel)}
            />
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

type ChannelListItemProps = {
  channel: ChannelRow;
  isPending: boolean;
  onPress: () => void;
  onToggleSubscription: () => void;
};

function ChannelListItem({ channel, isPending, onPress, onToggleSubscription }: ChannelListItemProps) {
  const organizerName = channel.organizer
    ? `${channel.organizer.first_name} ${channel.organizer.last_name}`.trim()
    : channel.name;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.avatarWrapper}>
        <Avatar url={channel.organizer?.avatar_url} name={organizerName} size={48} />
        {channel.isSubscribed && channel.hasNewContent ? <View style={styles.unreadDot} /> : null}
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{channel.name}</Text>
        {channel.description ? (
          <Text style={styles.rowDescription} numberOfLines={1}>
            {channel.description}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.followButton, channel.isSubscribed && styles.followButtonActive]}
        onPress={(event) => {
          event.stopPropagation();
          onToggleSubscription();
        }}
        disabled={isPending}
        activeOpacity={0.8}
      >
        {isPending ? (
          <ActivityIndicator size="small" color={channel.isSubscribed ? Colors.primary : Colors.white} />
        ) : (
          <>
            {channel.isSubscribed ? (
              <Ionicons name="checkmark" size={14} color={Colors.primary} style={styles.followIcon} />
            ) : null}
            <Text style={[styles.followLabel, channel.isSubscribed && styles.followLabelActive]}>
              {channel.isSubscribed ? "Suivi" : "Suivre"}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 8,
  },
  errorText: {
    color: Colors.danger,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarWrapper: {
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.danger,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  rowInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  rowName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  rowDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  followButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    minWidth: 76,
    justifyContent: "center",
  },
  followButtonActive: {
    backgroundColor: Colors.primaryLight,
  },
  followIcon: {
    marginRight: 4,
  },
  followLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.white,
  },
  followLabelActive: {
    color: Colors.primary,
  },
});
