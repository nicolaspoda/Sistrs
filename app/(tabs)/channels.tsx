import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
    setErrorMessage(null);

    const [{ data: channelsData, error: channelsError }, subscriptionsResult] = await Promise.all([
      supabase
        .from("channels")
        .select("id, organizer_id, name, description, organizer:profiles!channels_organizer_id_fkey(*)")
        .order("name", { ascending: true }),
      profile
        ? supabase.from("channel_subscriptions").select("channel_id").eq("subscriber_id", profile.id)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (channelsError) {
      setErrorMessage("Impossible de charger les canaux.");
      return;
    }

    const { data: subscriptionsData, error: subscriptionsError } = subscriptionsResult;
    if (subscriptionsError) {
      setErrorMessage("Impossible de charger les canaux.");
      return;
    }

    const subscribedIds = new Set((subscriptionsData ?? []).map((row) => row.channel_id as string));

    const rows: ChannelRow[] = (channelsData ?? []).map((row: any) => ({
      id: row.id,
      organizer_id: row.organizer_id,
      name: row.name,
      description: row.description,
      organizer: (row.organizer as Profile | null) ?? null,
      isSubscribed: subscribedIds.has(row.id),
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

  const toggleSubscription = useCallback(
    async (channel: ChannelRow) => {
      if (!profile || pendingChannelId) return;

      setPendingChannelId(channel.id);
      const wasSubscribed = channel.isSubscribed;

      setChannels((prev) =>
        prev.map((row) => (row.id === channel.id ? { ...row, isSubscribed: !wasSubscribed } : row))
      );

      const { error } = wasSubscribed
        ? await supabase
            .from("channel_subscriptions")
            .delete()
            .eq("channel_id", channel.id)
            .eq("subscriber_id", profile.id)
        : await supabase
            .from("channel_subscriptions")
            .insert({ channel_id: channel.id, subscriber_id: profile.id });

      if (error) {
        setChannels((prev) =>
          prev.map((row) => (row.id === channel.id ? { ...row, isSubscribed: wasSubscribed } : row))
        );
      }

      setPendingChannelId(null);
    },
    [profile, pendingChannelId]
  );

  const followedChannels = useMemo(() => channels.filter((c) => c.isSubscribed), [channels]);
  const discoverChannels = useMemo(() => channels.filter((c) => !c.isSubscribed), [channels]);

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

        <Text style={styles.sectionTitle}>Suivis</Text>
        {followedChannels.length === 0 ? (
          <EmptyState
            title="Aucun canal suivi"
            subtitle="Découvre des organisatrices ci-dessous et abonne-toi à leur canal."
          />
        ) : (
          followedChannels.map((channel) => (
            <ChannelListItem
              key={channel.id}
              channel={channel}
              isPending={pendingChannelId === channel.id}
              onPress={() => router.push(`/channel/${channel.id}`)}
              onToggleSubscription={() => toggleSubscription(channel)}
            />
          ))
        )}

        <Text style={styles.sectionTitle}>Découvrir</Text>
        {discoverChannels.length === 0 ? (
          <EmptyState title="Aucun autre canal pour l'instant" />
        ) : (
          discoverChannels.map((channel) => (
            <ChannelListItem
              key={channel.id}
              channel={channel}
              isPending={pendingChannelId === channel.id}
              onPress={() => router.push(`/channel/${channel.id}`)}
              onToggleSubscription={() => toggleSubscription(channel)}
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
      <Avatar url={channel.organizer?.avatar_url} name={organizerName} size={48} />
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 10,
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
