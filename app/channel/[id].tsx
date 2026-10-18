import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Avatar } from "../../components/Avatar";
import { AuthTextField } from "../../components/AuthTextField";
import { EmptyState } from "../../components/EmptyState";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Colors } from "../../constants/colors";
import { CardShadow } from "../../constants/shadows";
import { notifyChannelsRead } from "../../lib/app-events";
import { useAuth } from "../../lib/auth/AuthProvider";
import { supabase } from "../../lib/supabase";
import type { Profile } from "../../lib/types";

type ChannelDetail = {
  id: string;
  organizer_id: string;
  name: string;
  description: string | null;
  organizer: Profile | null;
};

type PostItem = {
  kind: "post";
  id: string;
  created_at: string;
  content: string | null;
  image_url: string | null;
  event_id: string | null;
  likesCount: number;
  likedByMe: boolean;
};

type PollOptionItem = {
  id: string;
  label: string;
  position: number;
  votesCount: number;
};

type PollItem = {
  kind: "poll";
  id: string;
  created_at: string;
  question: string;
  options: PollOptionItem[];
  myVoteOptionId: string | null;
};

type FeedItem = PostItem | PollItem;

function formatBubbleTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Étiquette du séparateur de jour affiché au-dessus d'un groupe de publications
 * du même jour dans le fil, façon canal de messagerie (Aujourd'hui / Hier / date). */
function formatDaySeparator(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return "Aujourd'hui";
  if (isSameDay(date, yesterday)) return "Hier";
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default function ChannelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();

  const [channel, setChannel] = useState<ChannelDetail | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFollowPending, setIsFollowPending] = useState(false);
  const [pendingLikeId, setPendingLikeId] = useState<string | null>(null);
  const [pendingVotePollId, setPendingVotePollId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  const [showNewPoll, setShowNewPoll] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [newPollOptions, setNewPollOptions] = useState<string[]>(["", ""]);
  const [isSubmittingPoll, setIsSubmittingPoll] = useState(false);

  const isOrganizer = Boolean(profile && channel && profile.id === channel.organizer_id);

  const loadChannel = useCallback(async () => {
    if (!id) return;
    setErrorMessage(null);

    const { data: channelData, error: channelError } = await supabase
      .from("channels")
      .select("id, organizer_id, name, description, organizer:profiles!channels_organizer_id_fkey(*)")
      .eq("id", id)
      .maybeSingle();

    if (channelError || !channelData) {
      setErrorMessage("Impossible de charger ce canal.");
      return;
    }

    setChannel({
      id: channelData.id,
      organizer_id: channelData.organizer_id,
      name: channelData.name,
      description: channelData.description,
      organizer: (channelData.organizer as unknown as Profile) ?? null,
    });

    const { count: subscribersCountResult } = await supabase
      .from("channel_subscriptions")
      .select("subscriber_id", { count: "exact", head: true })
      .eq("channel_id", id);
    setSubscriberCount(subscribersCountResult ?? 0);

    if (profile) {
      const { data: subscriptionData } = await supabase
        .from("channel_subscriptions")
        .select("channel_id")
        .eq("channel_id", id)
        .eq("subscriber_id", profile.id)
        .maybeSingle();
      setIsSubscribed(Boolean(subscriptionData));

      if (subscriptionData) {
        // Marque le canal comme vu : efface le point "nouveau contenu"
        // sur l'onglet Canaux et dans la liste des canaux suivis, tout de
        // suite (pas seulement au prochain sondage de useTabBadges).
        void supabase
          .from("channel_subscriptions")
          .update({ last_viewed_at: new Date().toISOString() })
          .eq("channel_id", id)
          .eq("subscriber_id", profile.id)
          .then(() => notifyChannelsRead());
      }
    }

    const [{ data: postsData, error: postsError }, { data: pollsData, error: pollsError }] = await Promise.all([
      supabase
        .from("channel_posts")
        .select("id, created_at, content, image_url, event_id")
        .eq("channel_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("polls")
        .select("id, created_at, question, poll_options(id, label, position)")
        .eq("channel_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (postsError || pollsError) {
      setErrorMessage("Impossible de charger le fil de ce canal.");
      return;
    }

    const posts = postsData ?? [];
    const polls = pollsData ?? [];
    const postIds = posts.map((post) => post.id);
    const optionIds = polls.flatMap((poll: any) => (poll.poll_options ?? []).map((option: any) => option.id));
    const pollIds = polls.map((poll: any) => poll.id);

    const [likesResult, votesResult] = await Promise.all([
      postIds.length > 0
        ? supabase.from("channel_post_likes").select("post_id, profile_id").in("post_id", postIds)
        : Promise.resolve({ data: [], error: null }),
      optionIds.length > 0
        ? supabase.from("poll_votes").select("poll_id, option_id, profile_id").in("option_id", optionIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const likesData = likesResult.data ?? [];
    const votesData = votesResult.data ?? [];

    const postItems: PostItem[] = posts.map((post) => {
      const likesForPost = likesData.filter((like: any) => like.post_id === post.id);
      return {
        kind: "post",
        id: post.id,
        created_at: post.created_at,
        content: post.content,
        image_url: post.image_url,
        event_id: post.event_id,
        likesCount: likesForPost.length,
        likedByMe: Boolean(profile && likesForPost.some((like: any) => like.profile_id === profile.id)),
      };
    });

    const pollItems: PollItem[] = polls.map((poll: any) => {
      const options: PollOptionItem[] = (poll.poll_options ?? [])
        .slice()
        .sort((a: any, b: any) => a.position - b.position)
        .map((option: any) => ({
          id: option.id,
          label: option.label,
          position: option.position,
          votesCount: votesData.filter((vote: any) => vote.option_id === option.id).length,
        }));

      const myVote = profile
        ? votesData.find((vote: any) => vote.poll_id === poll.id && vote.profile_id === profile.id)
        : undefined;

      return {
        kind: "poll",
        id: poll.id,
        created_at: poll.created_at,
        question: poll.question,
        options,
        myVoteOptionId: myVote ? myVote.option_id : null,
      };
    });

    const combined: FeedItem[] = [...postItems, ...pollItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setFeed(combined);
    void pollIds;
  }, [id, profile]);

  useEffect(() => {
    setIsLoading(true);
    loadChannel().finally(() => setIsLoading(false));
  }, [loadChannel]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadChannel();
    setIsRefreshing(false);
  }, [loadChannel]);

  const toggleFollow = useCallback(async () => {
    if (!profile || !channel || isFollowPending) return;
    setIsFollowPending(true);
    const wasSubscribed = isSubscribed;
    setIsSubscribed(!wasSubscribed);

    const { error } = wasSubscribed
      ? await supabase
          .from("channel_subscriptions")
          .delete()
          .eq("channel_id", channel.id)
          .eq("subscriber_id", profile.id)
      : await supabase.from("channel_subscriptions").insert({ channel_id: channel.id, subscriber_id: profile.id });

    if (error) {
      setIsSubscribed(wasSubscribed);
    }
    setIsFollowPending(false);
  }, [profile, channel, isSubscribed, isFollowPending]);

  const toggleLike = useCallback(
    async (post: PostItem) => {
      if (!profile || pendingLikeId) return;
      setPendingLikeId(post.id);

      const wasLiked = post.likedByMe;
      setFeed((prev) =>
        prev.map((item) =>
          item.kind === "post" && item.id === post.id
            ? { ...item, likedByMe: !wasLiked, likesCount: item.likesCount + (wasLiked ? -1 : 1) }
            : item
        )
      );

      const { error } = wasLiked
        ? await supabase
            .from("channel_post_likes")
            .delete()
            .eq("post_id", post.id)
            .eq("profile_id", profile.id)
        : await supabase.from("channel_post_likes").insert({ post_id: post.id, profile_id: profile.id });

      if (error) {
        setFeed((prev) =>
          prev.map((item) =>
            item.kind === "post" && item.id === post.id
              ? { ...item, likedByMe: wasLiked, likesCount: item.likesCount + (wasLiked ? 1 : -1) }
              : item
          )
        );
      }

      setPendingLikeId(null);
    },
    [profile, pendingLikeId]
  );

  const voteOnPoll = useCallback(
    async (poll: PollItem, optionId: string) => {
      if (!profile || pendingVotePollId) return;
      if (poll.myVoteOptionId === optionId) return;

      setPendingVotePollId(poll.id);
      const previousVoteOptionId = poll.myVoteOptionId;

      setFeed((prev) =>
        prev.map((item) => {
          if (item.kind !== "poll" || item.id !== poll.id) return item;
          return {
            ...item,
            myVoteOptionId: optionId,
            options: item.options.map((option) => {
              if (option.id === optionId) return { ...option, votesCount: option.votesCount + 1 };
              if (option.id === previousVoteOptionId) return { ...option, votesCount: Math.max(0, option.votesCount - 1) };
              return option;
            }),
          };
        })
      );

      const { error } = await supabase
        .from("poll_votes")
        .upsert(
          { poll_id: poll.id, option_id: optionId, profile_id: profile.id },
          { onConflict: "poll_id,profile_id" }
        );

      if (error) {
        setFeed((prev) =>
          prev.map((item) => {
            if (item.kind !== "poll" || item.id !== poll.id) return item;
            return {
              ...item,
              myVoteOptionId: previousVoteOptionId,
              options: item.options.map((option) => {
                if (option.id === optionId) return { ...option, votesCount: Math.max(0, option.votesCount - 1) };
                if (option.id === previousVoteOptionId) return { ...option, votesCount: option.votesCount + 1 };
                return option;
              }),
            };
          })
        );
      }

      setPendingVotePollId(null);
    },
    [profile, pendingVotePollId]
  );

  const submitNewPost = useCallback(async () => {
    if (!channel || !newPostContent.trim() || isSubmittingPost) return;
    setIsSubmittingPost(true);

    const { data, error } = await supabase
      .from("channel_posts")
      .insert({ channel_id: channel.id, content: newPostContent.trim() })
      .select("id, created_at, content, image_url, event_id")
      .single();

    if (!error && data) {
      const postItem: PostItem = {
        kind: "post",
        id: data.id,
        created_at: data.created_at,
        content: data.content,
        image_url: data.image_url,
        event_id: data.event_id,
        likesCount: 0,
        likedByMe: false,
      };
      setFeed((prev) => [postItem, ...prev]);
      setNewPostContent("");
      setShowNewPost(false);
    } else {
      setErrorMessage("Impossible de publier ce post.");
    }

    setIsSubmittingPost(false);
  }, [channel, newPostContent, isSubmittingPost]);

  const updatePollOptionText = useCallback((index: number, text: string) => {
    setNewPollOptions((prev) => prev.map((value, i) => (i === index ? text : value)));
  }, []);

  const addPollOption = useCallback(() => {
    setNewPollOptions((prev) => [...prev, ""]);
  }, []);

  const removePollOption = useCallback((index: number) => {
    setNewPollOptions((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev));
  }, []);

  const submitNewPoll = useCallback(async () => {
    const trimmedOptions = newPollOptions.map((option) => option.trim()).filter((option) => option.length > 0);
    if (!channel || !newPollQuestion.trim() || trimmedOptions.length < 2 || isSubmittingPoll) return;

    setIsSubmittingPoll(true);

    const { data: pollData, error: pollError } = await supabase
      .from("polls")
      .insert({ channel_id: channel.id, question: newPollQuestion.trim() })
      .select("id, created_at, question")
      .single();

    if (pollError || !pollData) {
      setErrorMessage("Impossible de créer ce sondage.");
      setIsSubmittingPoll(false);
      return;
    }

    const { data: optionsData, error: optionsError } = await supabase
      .from("poll_options")
      .insert(trimmedOptions.map((label, position) => ({ poll_id: pollData.id, label, position })))
      .select("id, label, position");

    if (optionsError || !optionsData) {
      setErrorMessage("Impossible de créer les options de ce sondage.");
      setIsSubmittingPoll(false);
      return;
    }

    const pollItem: PollItem = {
      kind: "poll",
      id: pollData.id,
      created_at: pollData.created_at,
      question: pollData.question,
      options: optionsData
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((option) => ({ id: option.id, label: option.label, position: option.position, votesCount: 0 })),
      myVoteOptionId: null,
    };

    setFeed((prev) => [pollItem, ...prev]);
    setNewPollQuestion("");
    setNewPollOptions(["", ""]);
    setShowNewPoll(false);
    setIsSubmittingPoll(false);
  }, [channel, newPollQuestion, newPollOptions, isSubmittingPoll]);

  const organizerName = useMemo(() => {
    if (!channel) return "";
    return channel.organizer
      ? `${channel.organizer.first_name} ${channel.organizer.last_name}`.trim()
      : channel.name;
  }, [channel]);

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!channel) {
    return (
      <ScreenContainer>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <EmptyState title="Canal introuvable" subtitle={errorMessage ?? undefined} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCard}>
          <View style={styles.header}>
            <Avatar url={channel.organizer?.avatar_url} name={organizerName} size={72} />
            <View style={styles.headerInfo}>
              <View style={styles.headerNameRow}>
                <Text style={styles.headerName} numberOfLines={1}>{channel.name}</Text>
                <Ionicons name="megaphone" size={15} color={Colors.primary} />
              </View>
              <Text style={styles.headerMeta}>
                {subscriberCount} abonnée{subscriberCount > 1 ? "s" : ""}
              </Text>
              {channel.description ? (
                <Text style={styles.headerDescription} numberOfLines={2}>{channel.description}</Text>
              ) : null}
            </View>
          </View>

          {profile ? (
            <TouchableOpacity
              style={[styles.followButton, isSubscribed && styles.followButtonActive]}
              onPress={toggleFollow}
              disabled={isFollowPending}
              activeOpacity={0.85}
            >
              {isFollowPending ? (
                <ActivityIndicator size="small" color={isSubscribed ? Colors.primary : Colors.white} />
              ) : (
                <>
                  {isSubscribed ? <Ionicons name="checkmark" size={15} color={Colors.primary} /> : null}
                  <Text style={[styles.followLabel, isSubscribed && styles.followLabelActive]}>
                    {isSubscribed ? "Abonnée" : "S'abonner"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {isOrganizer ? (
          <View style={styles.organizerActions}>
            <PrimaryButton
              label={showNewPost ? "Annuler" : "Nouveau post"}
              variant={showNewPost ? "outline" : "primary"}
              style={styles.organizerActionButton}
              onPress={() => {
                setShowNewPost((prev) => !prev);
                setShowNewPoll(false);
              }}
            />
            <PrimaryButton
              label={showNewPoll ? "Annuler" : "Nouveau sondage"}
              variant={showNewPoll ? "outline" : "primary"}
              style={styles.organizerActionButton}
              onPress={() => {
                setShowNewPoll((prev) => !prev);
                setShowNewPost(false);
              }}
            />
          </View>
        ) : null}

        {isOrganizer && showNewPost ? (
          <View style={styles.formCard}>
            <AuthTextField
              label="Contenu du post"
              placeholder="Quoi de neuf ?"
              multiline
              numberOfLines={4}
              value={newPostContent}
              onChangeText={setNewPostContent}
              style={styles.multilineInput}
            />
            <PrimaryButton
              label="Publier"
              isLoading={isSubmittingPost}
              disabled={!newPostContent.trim()}
              onPress={submitNewPost}
            />
          </View>
        ) : null}

        {isOrganizer && showNewPoll ? (
          <View style={styles.formCard}>
            <AuthTextField label="Question" placeholder="Pose ta question" value={newPollQuestion} onChangeText={setNewPollQuestion} />
            {newPollOptions.map((option, index) => (
              <View key={index} style={styles.pollOptionInputRow}>
                <TextInput
                  style={styles.pollOptionInput}
                  placeholder={`Option ${index + 1}`}
                  placeholderTextColor={Colors.textMuted}
                  value={option}
                  onChangeText={(text) => updatePollOptionText(index, text)}
                />
                {newPollOptions.length > 2 ? (
                  <TouchableOpacity onPress={() => removePollOption(index)} style={styles.removeOptionButton}>
                    <Ionicons name="close" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
            <TouchableOpacity onPress={addPollOption} style={styles.addOptionButton}>
              <Ionicons name="add" size={16} color={Colors.primary} />
              <Text style={styles.addOptionLabel}>Ajouter une option</Text>
            </TouchableOpacity>
            <PrimaryButton
              label="Créer le sondage"
              isLoading={isSubmittingPoll}
              disabled={
                !newPollQuestion.trim() || newPollOptions.map((o) => o.trim()).filter(Boolean).length < 2
              }
              onPress={submitNewPoll}
              style={styles.createPollButton}
            />
          </View>
        ) : null}

        <View style={styles.feed}>
          {feed.length === 0 ? (
            <EmptyState
              icon="megaphone-outline"
              title="Pas encore de publication"
              subtitle="Les posts et sondages de ce canal apparaîtront ici."
            />
          ) : (
            feed.map((item, index) => {
              const previousItem = feed[index - 1];
              const showDaySeparator =
                !previousItem || !isSameDay(new Date(previousItem.created_at), new Date(item.created_at));

              return (
                <View key={`${item.kind}-${item.id}`}>
                  {showDaySeparator ? (
                    <View style={styles.daySeparatorRow}>
                      <Text style={styles.daySeparatorText}>{formatDaySeparator(item.created_at)}</Text>
                    </View>
                  ) : null}
                  {item.kind === "post" ? (
                    <PostCard
                      post={item}
                      organizerName={organizerName}
                      organizerAvatarUrl={channel.organizer?.avatar_url}
                      isLikePending={pendingLikeId === item.id}
                      onToggleLike={() => toggleLike(item)}
                      onOpenEvent={() => item.event_id && router.push(`/event/${item.event_id}`)}
                    />
                  ) : (
                    <PollCard
                      poll={item}
                      organizerName={organizerName}
                      organizerAvatarUrl={channel.organizer?.avatar_url}
                      isVotePending={pendingVotePollId === item.id}
                      onVote={(optionId) => voteOnPoll(item, optionId)}
                    />
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function PostCard({
  post,
  organizerName,
  organizerAvatarUrl,
  isLikePending,
  onToggleLike,
  onOpenEvent,
}: {
  post: PostItem;
  organizerName: string;
  organizerAvatarUrl?: string | null;
  isLikePending: boolean;
  onToggleLike: () => void;
  onOpenEvent: () => void;
}) {
  return (
    <View style={styles.messageRow}>
      <Avatar url={organizerAvatarUrl} name={organizerName} size={30} />
      <View style={styles.messageBody}>
        <Text style={styles.senderName} numberOfLines={1}>{organizerName}</Text>
        <View style={styles.bubble}>
          {post.content ? <Text style={styles.cardContent}>{post.content}</Text> : null}
          {post.event_id ? (
            <TouchableOpacity onPress={onOpenEvent} style={styles.eventLink} activeOpacity={0.8}>
              <Ionicons name="calendar" size={16} color={Colors.primary} />
              <Text style={styles.eventLinkLabel}>Voir l'événement</Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.cardFooter}>
            <TouchableOpacity style={styles.likeButton} onPress={onToggleLike} disabled={isLikePending} activeOpacity={0.8}>
              <Ionicons
                name={post.likedByMe ? "heart" : "heart-outline"}
                size={16}
                color={post.likedByMe ? Colors.primary : Colors.textMuted}
              />
              <Text style={[styles.likeCount, post.likedByMe && styles.likeCountActive]}>{post.likesCount}</Text>
            </TouchableOpacity>
            <Text style={styles.bubbleTime}>{formatBubbleTime(post.created_at)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function PollCard({
  poll,
  organizerName,
  organizerAvatarUrl,
  isVotePending,
  onVote,
}: {
  poll: PollItem;
  organizerName: string;
  organizerAvatarUrl?: string | null;
  isVotePending: boolean;
  onVote: (optionId: string) => void;
}) {
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votesCount, 0);

  return (
    <View style={styles.messageRow}>
      <Avatar url={organizerAvatarUrl} name={organizerName} size={30} />
      <View style={styles.messageBody}>
        <Text style={styles.senderName} numberOfLines={1}>{organizerName}</Text>
        <View style={styles.bubble}>
      <View style={styles.pollHeaderRow}>
        <Ionicons name="bar-chart" size={15} color={Colors.primary} />
        <Text style={styles.pollLabel}>SONDAGE</Text>
      </View>
      <Text style={styles.pollQuestion}>{poll.question}</Text>
      {poll.options.map((option) => {
        const percentage = totalVotes > 0 ? Math.round((option.votesCount / totalVotes) * 100) : 0;
        const isMyVote = poll.myVoteOptionId === option.id;

        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.pollOption, isMyVote && styles.pollOptionSelected]}
            onPress={() => onVote(option.id)}
            disabled={isVotePending}
            activeOpacity={0.8}
          >
            <View style={[styles.pollOptionBar, { width: `${percentage}%` }]} />
            <View style={styles.pollOptionContent}>
              <Text style={[styles.pollOptionLabel, isMyVote && styles.pollOptionLabelSelected]}>
                {option.label}
              </Text>
              <Text style={[styles.pollOptionPercentage, isMyVote && styles.pollOptionLabelSelected]}>
                {percentage}%
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
      <View style={styles.cardFooter}>
        <Text style={styles.pollTotal}>{totalVotes} vote{totalVotes === 1 ? "" : "s"}</Text>
        <Text style={styles.bubbleTime}>{formatBubbleTime(poll.created_at)}</Text>
      </View>
        </View>
      </View>
    </View>
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
    paddingTop: 8,
    paddingBottom: 40,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    ...CardShadow,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 14,
  },
  headerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerName: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
    flexShrink: 1,
  },
  headerMeta: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: "600",
    marginTop: 2,
  },
  headerDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 6,
  },
  followButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    marginTop: 14,
  },
  followButtonActive: {
    backgroundColor: Colors.primaryLight,
  },
  followLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },
  followLabelActive: {
    color: Colors.primary,
  },
  errorText: {
    color: Colors.danger,
    marginBottom: 12,
  },
  organizerActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  organizerActionButton: {
    flex: 1,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  multilineInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  pollOptionInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  pollOptionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  removeOptionButton: {
    marginLeft: 8,
    padding: 6,
  },
  addOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  addOptionLabel: {
    marginLeft: 6,
    color: Colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  createPollButton: {
    marginTop: 4,
  },
  feed: {
    marginTop: 4,
  },
  daySeparatorRow: {
    alignItems: "center",
    marginVertical: 12,
  },
  daySeparatorText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    backgroundColor: Colors.white,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
    ...CardShadow,
  },
  // Ligne "message" façon canal de messagerie : avatar de l'organisatrice à
  // gauche + bulle à droite, pour que chaque publication se lise clairement
  // comme un message envoyé par elle (et pas une carte anonyme).
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 12,
  },
  messageBody: {
    flex: 1,
    maxWidth: "88%",
  },
  senderName: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primaryDark,
    marginBottom: 3,
    marginLeft: 4,
  },
  // Bulle façon canal de messagerie (Telegram) : coin inférieur gauche moins
  // arrondi pour évoquer une "queue" de bulle de message plutôt qu'une carte
  // classique.
  bubble: {
    alignSelf: "flex-start",
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 9,
    ...CardShadow,
  },
  cardContent: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 21,
  },
  eventLink: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  eventLinkLabel: {
    marginLeft: 6,
    color: Colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  likeCount: {
    marginLeft: 6,
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  likeCountActive: {
    color: Colors.primary,
  },
  bubbleTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  pollHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  pollLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.4,
  },
  pollQuestion: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  pollOption: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
    overflow: "hidden",
    position: "relative",
    backgroundColor: Colors.background,
  },
  pollOptionSelected: {
    borderColor: Colors.primary,
  },
  pollOptionBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: Colors.primaryLight,
  },
  pollOptionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pollOptionLabel: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
  },
  pollOptionLabelSelected: {
    color: Colors.primaryDark,
    fontWeight: "700",
  },
  pollOptionPercentage: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  pollTotal: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
