import { router } from "expo-router";
import { useEffect, useState, type PropsWithChildren } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, type ViewStyle } from "react-native";

import { BackButton } from "../../components/BackButton";
import { PatternBackground } from "../../components/PatternBackground";
import { DatePickerField } from "../../components/DatePickerField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Colors } from "../../constants/colors";
import { useAuth } from "../../lib/auth/AuthProvider";
import { supabase } from "../../lib/supabase";
import type { Category } from "../../lib/types";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Parse une valeur "YYYY-MM-DDTHH:mm" (DatePickerField, mode datetime) en Date locale, ou null si vide/invalide. */
function parseIsoDateTime(iso: string): Date | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Demain à 19h : valeur pré-sélectionnée à l'ouverture du calendrier de début. */
function defaultStartDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(19, 0, 0, 0);
  return date;
}

/** Après-demain à 19h : valeur pré-sélectionnée à l'ouverture du calendrier de date limite. */
function defaultDeadlineDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  date.setHours(19, 0, 0, 0);
  return date;
}

export default function CreateEventScreen() {
  const { session, profile } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [startAtIso, setStartAtIso] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [meetingLat, setMeetingLat] = useState("");
  const [meetingLng, setMeetingLng] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [deadlineIso, setDeadlineIso] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile && profile.role !== "organizer") {
      router.replace("/(tabs)");
    }
  }, [profile]);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      const { data, error } = await supabase.from("categories").select("*");
      if (!isMounted) return;
      if (!error && data) {
        setCategories(data as Category[]);
      }
      setIsLoadingCategories(false);
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!profile || profile.role !== "organizer") {
    return null;
  }

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!title.trim() || !description.trim() || !meetingPoint.trim()) {
      setErrorMessage("Titre, description et lieu sont obligatoires.");
      return;
    }

    if (!categoryId) {
      setErrorMessage("Choisis une catégorie.");
      return;
    }

    const startAt = parseIsoDateTime(startAtIso);
    if (!startAt) {
      setErrorMessage("Choisis la date et l'heure de début.");
      return;
    }

    const deadline = parseIsoDateTime(deadlineIso);
    if (!deadline) {
      setErrorMessage("Choisis la date et l'heure limite d'inscription.");
      return;
    }

    if (deadline.getTime() > startAt.getTime() - ONE_DAY_MS) {
      setErrorMessage("La date limite d'inscription doit être au moins 24h avant le début.");
      return;
    }

    const maxParticipantsNumber = Number.parseInt(maxParticipants, 10);
    if (!Number.isFinite(maxParticipantsNumber) || maxParticipantsNumber <= 0) {
      setErrorMessage("Le nombre maximum de participantes doit être un nombre positif.");
      return;
    }

    const lat = meetingLat.trim() ? Number.parseFloat(meetingLat.replace(",", ".")) : null;
    const lng = meetingLng.trim() ? Number.parseFloat(meetingLng.replace(",", ".")) : null;

    if (meetingLat.trim() && !Number.isFinite(lat)) {
      setErrorMessage("Latitude invalide.");
      return;
    }
    if (meetingLng.trim() && !Number.isFinite(lng)) {
      setErrorMessage("Longitude invalide.");
      return;
    }

    if (!session?.user.id) {
      setErrorMessage("Session expirée, reconnecte-toi.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: channel, error: channelError } = await supabase
        .from("channels")
        .select("id")
        .eq("organizer_id", session.user.id)
        .single();

      if (channelError || !channel) {
        setErrorMessage("Impossible de retrouver ton canal d'organisatrice.");
        return;
      }

      const { data: newEvent, error: insertError } = await supabase
        .from("events")
        .insert({
          organizer_id: session.user.id,
          channel_id: channel.id,
          category_id: categoryId,
          title: title.trim(),
          description: description.trim(),
          cover_image_url: null,
          start_at: startAt.toISOString(),
          end_at: null,
          meeting_point: meetingPoint.trim(),
          meeting_lat: lat,
          meeting_lng: lng,
          max_participants: maxParticipantsNumber,
          registration_deadline: deadline.toISOString(),
          status: "published",
        })
        .select("id")
        .single();

      if (insertError || !newEvent) {
        setErrorMessage("Impossible de créer l'événement. Réessaie.");
        return;
      }

      router.replace(`/event/${newEvent.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PatternBackground>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <BackButton style={styles.backButton} />
      <Text style={styles.title}>Créer un événement</Text>

      <Field label="Titre">
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Soirée karaoké entre sistrs"
          placeholderTextColor={Colors.textMuted}
        />
      </Field>

      <Field label="Description">
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Décris l'événement…"
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={4}
        />
      </Field>

      <Text style={styles.sectionLabel}>Catégorie</Text>
      {isLoadingCategories ? (
        <Text style={styles.helperText}>Chargement des catégories…</Text>
      ) : (
        <View style={styles.chipsWrap}>
          {categories.map((category) => {
            const isSelected = categoryId === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setCategoryId(category.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                  {category.emoji ? `${category.emoji} ` : ""}
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Text style={styles.sectionLabel}>Date et heure de début</Text>
      <DatePickerField
        label="Début de l'événement"
        value={startAtIso}
        onChange={setStartAtIso}
        mode="datetime"
        minimumDate={new Date()}
        defaultDate={defaultStartDate()}
        placeholder="Choisir une date et une heure"
      />

      <Field label="Lieu">
        <TextInput
          style={styles.input}
          value={meetingPoint}
          onChangeText={setMeetingPoint}
          placeholder="Bar Le Sistrs, 12 rue des Fleurs"
          placeholderTextColor={Colors.textMuted}
        />
      </Field>

      <View style={styles.row}>
        <Field label="Latitude (optionnel)" style={styles.rowField}>
          <TextInput
            style={styles.input}
            value={meetingLat}
            onChangeText={setMeetingLat}
            placeholder="48.8566"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numbers-and-punctuation"
          />
        </Field>
        <Field label="Longitude (optionnel)" style={styles.rowField}>
          <TextInput
            style={styles.input}
            value={meetingLng}
            onChangeText={setMeetingLng}
            placeholder="2.3522"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numbers-and-punctuation"
          />
        </Field>
      </View>

      <Field label="Nombre maximum de participantes">
        <TextInput
          style={styles.input}
          value={maxParticipants}
          onChangeText={setMaxParticipants}
          placeholder="10"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
        />
      </Field>

      <Text style={styles.sectionLabel}>Date limite d'inscription (≥ 24h avant le début)</Text>
      <DatePickerField
        label="Date limite d'inscription"
        value={deadlineIso}
        onChange={setDeadlineIso}
        mode="datetime"
        minimumDate={new Date()}
        defaultDate={defaultDeadlineDate()}
        placeholder="Choisir une date et une heure"
      />

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <PrimaryButton
        label="Publier l'événement"
        onPress={handleSubmit}
        isLoading={isSubmitting}
        style={styles.submitButton}
      />
      </ScrollView>
    </PatternBackground>
  );
}

type FieldProps = PropsWithChildren<{
  label: string;
  style?: ViewStyle;
}>;

function Field({ label, children, style }: FieldProps) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    marginTop: 8,
    marginBottom: 4,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: 20,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 10,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipLabel: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "600",
  },
  chipLabelSelected: {
    color: Colors.white,
  },
  helperText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowField: {
    flex: 1,
  },
  error: {
    fontSize: 14,
    color: Colors.danger,
    marginBottom: 12,
  },
  submitButton: {
    marginTop: 8,
  },
});
