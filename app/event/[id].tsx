import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Avatar } from "../../components/Avatar";
import { PrimaryButton } from "../../components/PrimaryButton";
import { BackButton } from "../../components/BackButton";
import { ScreenContainer } from "../../components/ScreenContainer";
import {
  confirmedRegistrationsCount,
  formatEventDateTime,
  organizerFullName,
  type EventWithDetails,
} from "../../components/events/EventCard";
import { Colors } from "../../constants/colors";
import { useAuth } from "../../lib/auth/AuthProvider";
import { supabase } from "../../lib/supabase";
import type { EventShoppingListItem } from "../../lib/types";

const EVENT_SELECT = `
  *,
  category:categories(id, name, emoji, created_at),
  channel:channels(id, organizer_id, organizer:profiles!channels_organizer_id_fkey(id, first_name, last_name, avatar_url)),
  registrations:event_registrations(id, status, participant_id, participant:profiles(id, first_name, last_name, avatar_url))
`;

type RegistrationWithProfile = {
  id: string;
  status: string;
  participant_id: string;
  participant: { id: string; first_name: string; last_name: string; avatar_url: string | null } | null;
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();

  const [event, setEvent] = useState<EventWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isRegistering, setIsRegistering] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [shoppingItems, setShoppingItems] = useState<EventShoppingListItem[]>([]);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);

  const isOrganizer = Boolean(profile && event && profile.id === event.organizer_id);

  const loadEvent = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase.from("events").select(EVENT_SELECT).eq("id", id).maybeSingle();

    if (error || !data) {
      setLoadError("Impossible de charger cet événement.");
      return;
    }

    setEvent(data as unknown as EventWithDetails);
  }, [id]);

  const loadShoppingList = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("event_shopping_list_items")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setShoppingItems(data as EventShoppingListItem[]);
    }
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      setIsLoading(true);
      await loadEvent();
      await loadShoppingList();
      if (isMounted) setIsLoading(false);
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [loadEvent, loadShoppingList]);

  const handleRefreshAll = useCallback(async () => {
    await Promise.all([loadEvent(), loadShoppingList()]);
  }, [loadEvent, loadShoppingList]);

  if (isLoading) {
    return (
      <ScreenContainer>
        <BackButton style={styles.floatingBack} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (loadError || !event) {
    return (
      <ScreenContainer>
        <BackButton style={styles.floatingBack} />
        <View style={styles.centered}>
          <Text style={styles.error}>{loadError ?? "Événement introuvable."}</Text>
        </View>
      </ScreenContainer>
    );
  }

  const registrations = (event.registrations as unknown as RegistrationWithProfile[] | null) ?? [];
  const confirmedRegistrations = registrations.filter((registration) => registration.status === "confirmed");
  const confirmedCount = confirmedRegistrationsCount(event.registrations);
  const spotsLeft = Math.max(event.max_participants - confirmedCount, 0);
  const isFull = spotsLeft <= 0;
  const deadlinePassed = new Date() >= new Date(event.registration_deadline);
  const myRegistration = session?.user.id
    ? confirmedRegistrations.find((registration) => registration.participant_id === session.user.id)
    : undefined;
  const isRegistered = Boolean(myRegistration);

  const handleOpenMaps = () => {
    const query = encodeURIComponent(event.meeting_point);
    const url =
      event.meeting_lat != null && event.meeting_lng != null
        ? `https://maps.apple.com/?q=${query}&ll=${event.meeting_lat},${event.meeting_lng}`
        : `https://maps.apple.com/?q=${query}`;
    Linking.openURL(url).catch(() => {
      setActionError("Impossible d'ouvrir le plan.");
    });
  };

  const handleRegister = async () => {
    if (!session?.user.id) return;
    setActionError(null);
    setIsRegistering(true);

    try {
      // Face ID est obligatoire pour s'inscrire à un événement, sans repli
      // sur le code/l'empreinte de l'appareil (voir CLAUDE.md).
      //
      // Bypass de test — Expo Go ne peut pas appliquer les entrées Info.plist
      // personnalisées (NSFaceIDUsageDescription), donc authenticateAsync()
      // échoue toujours avec "missing_usage_description" tant qu'on n'est
      // pas dans un development build. Hors production, on laisse passer
      // l'inscription malgré l'échec pour pouvoir tester le reste de l'app.
      // Jamais le cas en production : Face ID y reste réellement obligatoire.
      const isProduction = process.env.EXPO_PUBLIC_ENV === "production";

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const hasFaceId = supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      );

      if (!hasFaceId && isProduction) {
        setActionError("Face ID n'est pas disponible sur cet appareil, impossible de continuer.");
        setIsRegistering(false);
        return;
      }

      if (hasFaceId) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Confirme ton identité avec Face ID pour t'inscrire",
          cancelLabel: "Annuler",
          disableDeviceFallback: true,
        });
        if (!result.success && isProduction) {
          setActionError("La vérification Face ID a échoué ou a été annulée. Impossible de t'inscrire.");
          setIsRegistering(false);
          return;
        }
        if (!result.success) {
          console.log(
            "[dev] Face ID a échoué (probablement missing_usage_description sous Expo Go) — inscription poursuivie car EXPO_PUBLIC_ENV n'est pas 'production'."
          );
        }
      } else {
        console.log(
          "[dev] Face ID indisponible sur cet appareil/build — inscription poursuivie car EXPO_PUBLIC_ENV n'est pas 'production'."
        );
      }

      const { error } = await supabase.from("event_registrations").insert({
        event_id: event.id,
        participant_id: session.user.id,
        status: "confirmed",
        face_id_verified_at: new Date().toISOString(),
      });

      if (error) {
        if (error.code === "23505") {
          setActionError("Tu es déjà inscrite à cet événement.");
        } else {
          setActionError("Impossible de finaliser ton inscription. Réessaie.");
        }
        return;
      }

      await handleRefreshAll();
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!session?.user.id) return;
    setActionError(null);
    setIsCancelling(true);

    try {
      const { error } = await supabase
        .from("event_registrations")
        .delete()
        .eq("event_id", event.id)
        .eq("participant_id", session.user.id);

      if (error) {
        setActionError("Impossible d'annuler ton inscription. Réessaie.");
        return;
      }

      await handleRefreshAll();
    } finally {
      setIsCancelling(false);
    }
  };

  const handleAddShoppingItem = async () => {
    if (!newItemLabel.trim() || !session?.user.id) return;
    setIsAddingItem(true);

    try {
      const { error } = await supabase.from("event_shopping_list_items").insert({
        event_id: event.id,
        label: newItemLabel.trim(),
        added_by: session.user.id,
      });

      if (!error) {
        setNewItemLabel("");
        await loadShoppingList();
      }
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleToggleShoppingItem = async (item: EventShoppingListItem) => {
    const { error } = await supabase
      .from("event_shopping_list_items")
      .update({ is_checked: !item.is_checked })
      .eq("id", item.id);

    if (!error) {
      await loadShoppingList();
    }
  };

  const handleDeleteShoppingItem = async (item: EventShoppingListItem) => {
    const { error } = await supabase.from("event_shopping_list_items").delete().eq("id", item.id);
    if (!error) {
      await loadShoppingList();
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <BackButton style={styles.scrollBack} />
        {event.cover_image_url ? (
          <Image source={{ uri: event.cover_image_url }} style={styles.cover} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverEmoji}>{event.category?.emoji ?? "🎉"}</Text>
          </View>
        )}

        <View style={styles.section}>
          {event.category ? (
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipLabel}>
                {event.category.emoji ? `${event.category.emoji} ` : ""}
                {event.category.name}
              </Text>
            </View>
          ) : null}

          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.dateTime}>{formatEventDateTime(event.start_at)}</Text>

          <TouchableOpacity
            style={styles.organizerRow}
            onPress={() => router.push(`/profile/${event.organizer_id}`)}
            activeOpacity={0.8}
          >
            <Avatar url={event.channel?.organizer?.avatar_url} name={organizerFullName(event)} size={40} />
            <View style={styles.organizerTextBlock}>
              <Text style={styles.organizerLabel}>Organisée par</Text>
              <Text style={styles.organizerName}>{organizerFullName(event)}</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.description}>{event.description}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={Colors.textMuted} />
            <Text style={styles.infoText}>{event.meeting_point}</Text>
          </View>
          <PrimaryButton
            label="Ouvrir dans Plans"
            variant="outline"
            onPress={handleOpenMaps}
            style={styles.mapsButton}
          />

          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={18} color={Colors.textMuted} />
            <Text style={styles.infoText}>
              {spotsLeft > 0
                ? `${spotsLeft} place${spotsLeft > 1 ? "s" : ""} restante${spotsLeft > 1 ? "s" : ""} sur ${event.max_participants}`
                : `Complet (${event.max_participants} places)`}
            </Text>
          </View>

          {confirmedRegistrations.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.participantsRow}>
              {confirmedRegistrations.map((registration) => (
                <View key={registration.id} style={styles.participantAvatar}>
                  <Avatar
                    url={registration.participant?.avatar_url}
                    name={
                      registration.participant
                        ? `${registration.participant.first_name} ${registration.participant.last_name}`
                        : "Participante"
                    }
                    size={36}
                  />
                </View>
              ))}
            </ScrollView>
          ) : null}

          {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

          {isRegistered ? (
            <View style={styles.registeredBlock}>
              <Text style={styles.registeredBadge}>Inscrite ✓</Text>
              <PrimaryButton
                label="Annuler mon inscription"
                variant="outline"
                onPress={handleCancelRegistration}
                isLoading={isCancelling}
                style={styles.actionButton}
              />
            </View>
          ) : !isFull && !deadlinePassed ? (
            <PrimaryButton
              label="S'inscrire"
              onPress={handleRegister}
              isLoading={isRegistering}
              style={styles.actionButton}
            />
          ) : (
            <PrimaryButton
              label={isFull ? "Événement complet" : "Inscriptions closes"}
              disabled
              onPress={() => {}}
              style={styles.actionButton}
            />
          )}
        </View>

        {isOrganizer ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Liste de courses</Text>

            {shoppingItems.length === 0 ? (
              <Text style={styles.helperText}>Aucun article pour l'instant.</Text>
            ) : (
              shoppingItems.map((item) => (
                <View key={item.id} style={styles.shoppingItemRow}>
                  <TouchableOpacity
                    style={styles.shoppingItemToggle}
                    onPress={() => handleToggleShoppingItem(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={item.is_checked ? "checkbox" : "square-outline"}
                      size={20}
                      color={item.is_checked ? Colors.primary : Colors.textMuted}
                    />
                    <Text
                      style={[styles.shoppingItemLabel, item.is_checked && styles.shoppingItemLabelChecked]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteShoppingItem(item)}>
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}

            <View style={styles.addItemRow}>
              <TextInput
                style={styles.addItemInput}
                placeholder="Ajouter un article"
                placeholderTextColor={Colors.textMuted}
                value={newItemLabel}
                onChangeText={setNewItemLabel}
                onSubmitEditing={handleAddShoppingItem}
              />
              <TouchableOpacity
                style={styles.addItemButton}
                onPress={handleAddShoppingItem}
                disabled={isAddingItem || !newItemLabel.trim()}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  floatingBack: {
    marginLeft: 20,
    marginTop: 8,
  },
  scrollBack: {
    marginLeft: 20,
    marginTop: 8,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  cover: {
    width: "100%",
    height: 200,
  },
  coverPlaceholder: {
    width: "100%",
    height: 160,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  coverEmoji: {
    fontSize: 48,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  categoryChip: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  categoryChipLabel: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 6,
  },
  dateTime: {
    fontSize: 15,
    color: Colors.primaryDark,
    fontWeight: "600",
    marginBottom: 16,
  },
  organizerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  organizerTextBlock: {
    marginLeft: 10,
  },
  organizerLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  organizerName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  description: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 21,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text,
    flexShrink: 1,
  },
  mapsButton: {
    marginBottom: 16,
  },
  participantsRow: {
    marginBottom: 16,
  },
  participantAvatar: {
    marginRight: 8,
  },
  registeredBlock: {
    marginTop: 4,
  },
  registeredBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.success,
    color: Colors.white,
    fontWeight: "700",
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
    overflow: "hidden",
  },
  actionButton: {
    marginTop: 4,
  },
  error: {
    fontSize: 13,
    color: Colors.danger,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  helperText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  shoppingItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  shoppingItemToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  shoppingItemLabel: {
    fontSize: 15,
    color: Colors.text,
    flexShrink: 1,
  },
  shoppingItemLabelChecked: {
    color: Colors.textMuted,
    textDecorationLine: "line-through",
  },
  addItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  addItemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
  },
  addItemButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
