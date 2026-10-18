import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { Avatar } from "../../components/Avatar";
import { AuthTextField } from "../../components/AuthTextField";
import { EmptyState } from "../../components/EmptyState";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Colors } from "../../constants/colors";
import { CardShadow } from "../../constants/shadows";
import { useAuth } from "../../lib/auth/AuthProvider";
import { supabase } from "../../lib/supabase";
import type { Friendship, Profile } from "../../lib/types";

type FriendshipTab = "requests" | "friends" | "find";

type IncomingRequest = Friendship & { requester: Profile };
type FriendRow = Friendship & { friend: Profile };

function fullName(profile: Profile): string {
  return `${profile.first_name} ${profile.last_name}`.trim();
}

export default function FriendsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user.id;

  const [activeTab, setActiveTab] = useState<FriendshipTab>("requests");

  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingOutgoingIds, setPendingOutgoingIds] = useState<Set<string>>(new Set());
  const [existingFriendIds, setExistingFriendIds] = useState<Set<string>>(new Set());
  const [sendingRequestId, setSendingRequestId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) return;

    const [requestsResult, friendsResult, outgoingResult] = await Promise.all([
      supabase
        .from("friendships")
        .select("*, requester:profiles!friendships_requester_id_fkey(*)")
        .eq("addressee_id", userId)
        .eq("status", "pending"),
      supabase
        .from("friendships")
        .select("*, requester_profile:profiles!friendships_requester_id_fkey(*), addressee_profile:profiles!friendships_addressee_id_fkey(*)")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
      supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "pending")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
    ]);

    if (requestsResult.error) throw requestsResult.error;
    if (friendsResult.error) throw friendsResult.error;
    if (outgoingResult.error) throw outgoingResult.error;

    setRequests(
      (requestsResult.data as unknown as Array<Friendship & { requester: Profile }>).map((row) => ({
        ...row,
        requester: row.requester,
      }))
    );

    type FriendJoinRow = Friendship & {
      requester_profile: Profile;
      addressee_profile: Profile;
    };
    setFriends(
      (friendsResult.data as unknown as FriendJoinRow[]).map((row) => ({
        ...row,
        friend: row.requester_id === userId ? row.addressee_profile : row.requester_profile,
      }))
    );

    const pendingIds = new Set<string>();
    (outgoingResult.data as Array<{ requester_id: string; addressee_id: string }>).forEach((row) => {
      pendingIds.add(row.requester_id === userId ? row.addressee_id : row.requester_id);
    });
    setPendingOutgoingIds(pendingIds);
  }, [userId]);

  useEffect(() => {
    setIsLoading(true);
    loadData().finally(() => setIsLoading(false));
  }, [loadData]);

  useEffect(() => {
    setExistingFriendIds(new Set(friends.map((row) => row.friend.id)));
  }, [friends]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadData();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadData]);

  const handleAccept = useCallback(
    async (friendship: IncomingRequest) => {
      setActioningId(friendship.id);
      try {
        const { error } = await supabase
          .from("friendships")
          .update({ status: "accepted", responded_at: new Date().toISOString() })
          .eq("id", friendship.id);
        if (error) throw error;
        await loadData();
      } finally {
        setActioningId(null);
      }
    },
    [loadData]
  );

  const handleDecline = useCallback(
    async (friendship: IncomingRequest) => {
      setActioningId(friendship.id);
      try {
        const { error } = await supabase.from("friendships").delete().eq("id", friendship.id);
        if (error) throw error;
        await loadData();
      } finally {
        setActioningId(null);
      }
    },
    [loadData]
  );

  const handleRemoveFriend = useCallback(
    async (friendship: FriendRow) => {
      setActioningId(friendship.id);
      try {
        const { error } = await supabase.from("friendships").delete().eq("id", friendship.id);
        if (error) throw error;
        await loadData();
      } finally {
        setActioningId(null);
      }
    },
    [loadData]
  );

  const runSearch = useCallback(async () => {
    if (!userId || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const trimmed = searchQuery.trim();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or(`first_name.ilike.%${trimmed}%,last_name.ilike.%${trimmed}%`)
        .neq("id", userId)
        .limit(20);
      if (error) throw error;
      setSearchResults((data as Profile[]) ?? []);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, userId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      runSearch();
    }, 350);
    return () => clearTimeout(timeout);
  }, [runSearch]);

  const handleSendRequest = useCallback(
    async (target: Profile) => {
      if (!userId) return;
      setSendingRequestId(target.id);
      try {
        const { error } = await supabase.from("friendships").insert({
          requester_id: userId,
          addressee_id: target.id,
          status: "pending",
        });
        if (error) throw error;
        setPendingOutgoingIds((prev) => new Set(prev).add(target.id));
      } finally {
        setSendingRequestId(null);
      }
    },
    [userId]
  );

  const tabs = useMemo(
    () => [
      { key: "requests" as const, label: `Demandes${requests.length > 0 ? ` (${requests.length})` : ""}` },
      { key: "friends" as const, label: `Mes amies${friends.length > 0 ? ` (${friends.length})` : ""}` },
      { key: "find" as const, label: "Trouver" },
    ],
    [requests.length, friends.length]
  );

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Amies</Text>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "requests" ? (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="mail-unread-outline"
              title="Aucune demande en attente"
              subtitle="Les demandes d'amitié que tu reçois s'afficheront ici."
            />
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Avatar url={item.requester.avatar_url} name={fullName(item.requester)} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{fullName(item.requester)}</Text>
                <Text style={styles.rowSubtitle}>Veut devenir ton amie</Text>
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity
                  style={[styles.smallButton, styles.smallButtonPrimary]}
                  onPress={() => handleAccept(item)}
                  disabled={actioningId === item.id}
                >
                  {actioningId === item.id ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.smallButtonPrimaryLabel}>Accepter</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallButton, styles.smallButtonOutline]}
                  onPress={() => handleDecline(item)}
                  disabled={actioningId === item.id}
                >
                  <Text style={styles.smallButtonOutlineLabel}>Refuser</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : null}

      {activeTab === "friends" ? (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="Pas encore d'amies"
              subtitle="Cherche des profils dans l'onglet Trouver pour envoyer une demande."
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => router.push(`/profile/${item.friend.id}` as never)}
            >
              <Avatar url={item.friend.avatar_url} name={fullName(item.friend)} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{fullName(item.friend)}</Text>
                <Text style={[styles.rowSubtitle, styles.statusText]}>{item.friend.status}</Text>
              </View>
              <TouchableOpacity
                style={[styles.smallButton, styles.smallButtonOutline]}
                onPress={() => handleRemoveFriend(item)}
                disabled={actioningId === item.id}
              >
                {actioningId === item.id ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={styles.smallButtonOutlineLabel}>Retirer</Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      ) : null}

      {activeTab === "find" ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.searchHeader}>
              <AuthTextField
                label="Rechercher une amie"
                placeholder="Prénom ou nom"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="words"
              />
              {isSearching ? <ActivityIndicator color={Colors.primary} style={styles.searchLoader} /> : null}
            </View>
          }
          ListEmptyComponent={
            searchQuery.trim().length >= 2 && !isSearching ? (
              <EmptyState icon="search-outline" title="Aucun résultat" subtitle="Essaie un autre prénom ou nom." />
            ) : (
              <EmptyState
                icon="person-add-outline"
                title="Trouve tes amies"
                subtitle="Tape au moins 2 lettres d'un prénom ou d'un nom pour lancer la recherche."
              />
            )
          }
          renderItem={({ item }) => {
            const isFriend = existingFriendIds.has(item.id);
            const isPending = pendingOutgoingIds.has(item.id);
            return (
              <View style={styles.row}>
                <Avatar url={item.avatar_url} name={fullName(item)} />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{fullName(item)}</Text>
                  <Text style={[styles.rowSubtitle, styles.statusText]}>{item.status}</Text>
                </View>
                {isFriend ? (
                  <Text style={styles.statusLabel}>Déjà amie</Text>
                ) : isPending ? (
                  <Text style={styles.statusLabel}>Demande envoyée</Text>
                ) : (
                  <PrimaryButton
                    label="Ajouter"
                    style={styles.addButton}
                    onPress={() => handleSendRequest(item)}
                    isLoading={sendingRequestId === item.id}
                  />
                )}
              </View>
            );
          }}
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: Colors.surface,
    ...CardShadow,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  tabLabelActive: {
    color: Colors.white,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexGrow: 1,
  },
  searchHeader: {
    marginBottom: 8,
  },
  searchLoader: {
    marginTop: -4,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    ...CardShadow,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  rowSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  // Transformation réservée aux valeurs de statut brutes ("commun", "bronze"...)
  // — ne doit jamais s'appliquer à une phrase complète (mettrait une
  // majuscule à Chaque Mot).
  statusText: {
    textTransform: "capitalize",
  },
  rowActions: {
    flexDirection: "row",
    gap: 8,
  },
  smallButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  smallButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  smallButtonPrimaryLabel: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  smallButtonOutline: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  smallButtonOutlineLabel: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
