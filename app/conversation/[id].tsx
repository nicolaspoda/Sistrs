import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "../../components/Avatar";
import { PatternBackground } from "../../components/PatternBackground";
import { Colors } from "../../constants/colors";
import { useAuth } from "../../lib/auth/AuthProvider";
import { supabase } from "../../lib/supabase";
import type { Message, Profile } from "../../lib/types";

/**
 * Résout l'identifiant réel de la conversation à partir du paramètre de route.
 *
 * `id` peut être :
 * - un vrai `conversation_id` existant, ou
 * - l'id de profil d'une amie (navigation depuis un écran profil sans
 *   conversation existante encore) — dans ce cas on cherche une
 *   conversation existante entre les deux participantes (ids triés, la
 *   table `conversations` impose `participant_a < participant_b`), sinon
 *   on la crée.
 */
async function resolveConversationId(
  routeId: string,
  otherUserIdParam: string | undefined,
  currentUserId: string
): Promise<{ conversationId: string; otherProfileId: string }> {
  // Cas 1 : navigation explicite avec un otherUserId (profil d'une amie).
  const otherUserId = otherUserIdParam ?? null;

  if (!otherUserId) {
    // Cas 2 : le paramètre de route est peut-être déjà un conversation_id.
    const { data: existingConversation } = await supabase
      .from("conversations")
      .select("id, participant_a, participant_b")
      .eq("id", routeId)
      .maybeSingle();

    if (existingConversation) {
      const otherProfileId =
        existingConversation.participant_a === currentUserId
          ? existingConversation.participant_b
          : existingConversation.participant_a;
      return { conversationId: existingConversation.id, otherProfileId };
    }
  }

  // Cas 3 : le paramètre de route (ou otherUserId) est un profile_id sans
  // conversation existante — on cherche par paire triée, sinon on crée.
  const targetProfileId = otherUserId ?? routeId;
  const [participantA, participantB] = [currentUserId, targetProfileId].sort();

  const { data: foundConversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("participant_a", participantA)
    .eq("participant_b", participantB)
    .maybeSingle();

  if (foundConversation) {
    return { conversationId: foundConversation.id, otherProfileId: targetProfileId };
  }

  const { data: createdConversation, error: createError } = await supabase
    .from("conversations")
    .insert({ participant_a: participantA, participant_b: participantB })
    .select("id")
    .single();

  if (createError) {
    throw createError;
  }

  return { conversationId: createdConversation.id, otherProfileId: targetProfileId };
}

export default function ConversationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; otherUserId?: string }>();
  const { profile } = useAuth();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const listRef = useRef<FlatList<Message>>(null);

  // Résolution de la conversation (existante ou à créer) au chargement.
  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (!profile || !params.id) {
        return;
      }

      setIsLoading(true);

      try {
        const { conversationId: resolvedId, otherProfileId } = await resolveConversationId(
          params.id,
          params.otherUserId,
          profile.id
        );

        if (!isMounted) return;

        setConversationId(resolvedId);

        const [{ data: otherProfileData }, { data: messagesData }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", otherProfileId).maybeSingle(),
          supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", resolvedId)
            .order("created_at", { ascending: true }),
        ]);

        if (!isMounted) return;

        setOtherProfile((otherProfileData as Profile) ?? null);
        setMessages((messagesData as Message[]) ?? []);

        // Marque les messages reçus non lus comme lus à l'ouverture.
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .eq("conversation_id", resolvedId)
          .neq("sender_id", profile.id)
          .is("read_at", null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, params.id, params.otherUserId]);

  // Realtime : réception des nouveaux messages tant que l'écran est ouvert.
  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((current) => {
            if (current.some((message) => message.id === newMessage.id)) {
              return current;
            }
            return [...current, newMessage];
          });

          if (profile && newMessage.sender_id !== profile.id) {
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", newMessage.id)
              .then(() => undefined);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, profile?.id]);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const content = draft.trim();
    if (!content || !conversationId || !profile) {
      return;
    }

    setIsSending(true);
    setDraft("");

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: profile.id,
          content,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const newMessage = data as Message;
      setMessages((current) => {
        if (current.some((message) => message.id === newMessage.id)) {
          return current;
        }
        return [...current, newMessage];
      });
    } finally {
      setIsSending(false);
    }
  }, [draft, conversationId, profile]);

  if (isLoading || !profile) {
    return (
      <PatternBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </SafeAreaView>
      </PatternBackground>
    );
  }

  const otherFullName = otherProfile
    ? `${otherProfile.first_name} ${otherProfile.last_name}`
    : "Conversation";

  return (
    <PatternBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={26} color={Colors.text} />
          </TouchableOpacity>
          <Avatar url={otherProfile?.avatar_url} name={otherFullName} size={36} />
          <Text style={styles.headerName}>{otherFullName}</Text>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMine = item.sender_id === profile.id;
            return (
              <View
                style={[
                  styles.bubbleRow,
                  isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
                ]}
              >
                <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>
                    {item.content}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputRow}>
          <TextInput
            testID="input-message"
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Écris un message..."
            placeholderTextColor={Colors.textMuted}
            multiline
          />
          <TouchableOpacity
            testID="button-send-message"
            style={[styles.sendButton, (!draft.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!draft.trim() || isSending}
            activeOpacity={0.85}
          >
            <Ionicons name="send" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </PatternBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backButton: {
    marginRight: 4,
    padding: 4,
  },
  headerName: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bubbleRow: {
    marginBottom: 8,
    flexDirection: "row",
  },
  bubbleRowMine: {
    justifyContent: "flex-end",
  },
  bubbleRowTheirs: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
  },
  bubbleTheirs: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleTextMine: {
    color: Colors.white,
    fontSize: 15,
  },
  bubbleTextTheirs: {
    color: Colors.text,
    fontSize: 15,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
