import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Avatar } from "../../components/Avatar";
import { EmptyState } from "../../components/EmptyState";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Colors } from "../../constants/colors";
import { CardShadow } from "../../constants/shadows";
import { useAuth } from "../../lib/auth/AuthProvider";
import { supabase } from "../../lib/supabase";
import type { Profile } from "../../lib/types";

type ConversationRow = {
  id: string;
  otherProfile: Profile;
  lastMessageContent: string | null;
  lastMessageAt: string | null;
  hasUnread: boolean;
};

function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) {
    return "";
  }

  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));

  if (diffMinutes < 1) {
    return "maintenant";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return "hier";
  }
  if (diffDays < 7) {
    return `${diffDays} j`;
  }

  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function MessagesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    if (!profile) {
      return;
    }

    setIsLoading(true);

    try {
      const { data: conversationsData, error: conversationsError } = await supabase
        .from("conversations")
        .select("id, participant_a, participant_b, created_at")
        .or(`participant_a.eq.${profile.id},participant_b.eq.${profile.id}`)
        .order("created_at", { ascending: false });

      if (conversationsError) {
        throw conversationsError;
      }

      const rawConversations = conversationsData ?? [];

      const { data: unreadMessagesData } = await supabase
        .from("messages")
        .select("conversation_id")
        .neq("sender_id", profile.id)
        .is("read_at", null);

      const unreadConversationIds = new Set(
        (unreadMessagesData ?? []).map((row) => row.conversation_id as string)
      );

      const rows = await Promise.all(
        rawConversations.map(async (conversation) => {
          const otherProfileId =
            conversation.participant_a === profile.id
              ? conversation.participant_b
              : conversation.participant_a;

          const [{ data: otherProfileData }, { data: lastMessageData }] = await Promise.all([
            supabase.from("profiles").select("*").eq("id", otherProfileId).maybeSingle(),
            supabase
              .from("messages")
              .select("content, created_at")
              .eq("conversation_id", conversation.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          if (!otherProfileData) {
            return null;
          }

          return {
            id: conversation.id,
            otherProfile: otherProfileData as Profile,
            lastMessageContent: lastMessageData?.content ?? null,
            lastMessageAt: lastMessageData?.created_at ?? conversation.created_at,
            hasUnread: unreadConversationIds.has(conversation.id),
          } satisfies ConversationRow;
        })
      );

      const validRows = rows.filter((row): row is ConversationRow => row !== null);
      validRows.sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      });

      setConversations(validRows);
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {conversations.length === 0 ? (
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="Aucune conversation"
          subtitle="Écris à une amie depuis son profil pour démarrer une conversation."
        />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const fullName = `${item.otherProfile.first_name} ${item.otherProfile.last_name}`;
            return (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.7}
                onPress={() => router.push(`/conversation/${item.id}`)}
              >
                <View style={styles.avatarWrapper}>
                  <Avatar url={item.otherProfile.avatar_url} name={fullName} size={52} />
                  {item.hasUnread ? <View style={styles.unreadDot} /> : null}
                </View>
                <View style={styles.rowContent}>
                  <View style={styles.rowHeader}>
                    <Text style={[styles.name, item.hasUnread ? styles.nameUnread : null]}>{fullName}</Text>
                    <Text style={styles.timestamp}>{formatRelativeTime(item.lastMessageAt)}</Text>
                  </View>
                  <Text
                    style={[styles.lastMessage, item.hasUnread ? styles.lastMessageUnread : null]}
                    numberOfLines={1}
                  >
                    {item.lastMessageContent ?? "Démarrez la conversation"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    ...CardShadow,
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
  rowContent: {
    flex: 1,
    marginLeft: 12,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  nameUnread: {
    fontWeight: "800",
  },
  timestamp: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  lastMessage: {
    marginTop: 2,
    fontSize: 14,
    color: Colors.textMuted,
  },
  lastMessageUnread: {
    color: Colors.text,
    fontWeight: "600",
  },
});
