import { useCallback, useEffect, useState } from "react";

import { subscribeToChannelsRead } from "./app-events";
import { useAuth } from "./auth/AuthProvider";
import { supabase } from "./supabase";

export type TabBadges = {
  hasPendingFriendRequests: boolean;
  hasUnreadMessages: boolean;
  hasNewChannelContent: boolean;
  refresh: () => void;
};

// Calcule les points rouges des onglets (demandes d'amies, messages non
// lus, nouveau contenu dans les canaux suivis). Interrogé au montage puis
// toutes les 30s — pas de Realtime ici pour rester simple, un badge qui
// apparaît avec quelques secondes de retard est un compromis acceptable.
export function useTabBadges(): TabBadges {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [hasPendingFriendRequests, setHasPendingFriendRequests] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [hasNewChannelContent, setHasNewChannelContent] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  useEffect(() => {
    if (!userId) {
      setHasPendingFriendRequests(false);
      setHasUnreadMessages(false);
      setHasNewChannelContent(false);
      return;
    }

    let isMounted = true;

    async function load() {
      // Demandes d'amies en attente
      const { count: friendRequestsCount } = await supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("addressee_id", userId)
        .eq("status", "pending");

      // Messages non lus dans mes conversations
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .or(`participant_a.eq.${userId},participant_b.eq.${userId}`);
      const conversationIds = (conversations ?? []).map((c) => c.id);

      let unreadMessages = 0;
      if (conversationIds.length > 0) {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", conversationIds)
          .neq("sender_id", userId)
          .is("read_at", null);
        unreadMessages = count ?? 0;
      }

      // Nouveau contenu (posts/sondages) dans les canaux suivis depuis la
      // dernière visite (channel_subscriptions.last_viewed_at)
      const { data: subscriptions } = await supabase
        .from("channel_subscriptions")
        .select("channel_id, last_viewed_at")
        .eq("subscriber_id", userId);

      let newChannelContent = false;
      if (subscriptions && subscriptions.length > 0) {
        const channelIds = subscriptions.map((s) => s.channel_id);
        const lastViewedByChannel = new Map(subscriptions.map((s) => [s.channel_id, s.last_viewed_at]));

        const [{ data: posts }, { data: polls }] = await Promise.all([
          supabase.from("channel_posts").select("channel_id, created_at").in("channel_id", channelIds),
          supabase.from("polls").select("channel_id, created_at").in("channel_id", channelIds),
        ]);

        const items = [...(posts ?? []), ...(polls ?? [])];
        newChannelContent = items.some((item) => {
          const lastViewedAt = lastViewedByChannel.get(item.channel_id);
          return !lastViewedAt || new Date(item.created_at) > new Date(lastViewedAt);
        });
      }

      if (!isMounted) return;
      setHasPendingFriendRequests((friendRequestsCount ?? 0) > 0);
      setHasUnreadMessages(unreadMessages > 0);
      setHasNewChannelContent(newChannelContent);
    }

    load();
    const interval = setInterval(load, 30000);
    const unsubscribe = subscribeToChannelsRead(load);

    return () => {
      isMounted = false;
      clearInterval(interval);
      unsubscribe();
    };
  }, [userId, refreshToken]);

  return { hasPendingFriendRequests, hasUnreadMessages, hasNewChannelContent, refresh };
}
