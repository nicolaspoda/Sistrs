import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors } from "../constants/colors";
import { PrimaryButton } from "./PrimaryButton";

type DatePickerFieldProps = {
  label: string;
  /**
   * Valeur choisie au format ISO local, ou chaîne vide si aucune :
   * "YYYY-MM-DD" en mode "date", "YYYY-MM-DDTHH:mm" en mode "datetime".
   */
  value: string;
  /** Reçoit la valeur choisie dans le même format ISO local. */
  onChange: (iso: string) => void;
  placeholder?: string;
  hasError?: boolean;
  /** "date" (par défaut) pour une date seule, "datetime" pour date + heure. */
  mode?: "date" | "datetime";
  minimumDate?: Date;
  maximumDate?: Date;
  /** Date pré-sélectionnée à l'ouverture quand `value` est vide. */
  defaultDate?: Date;
  testID?: string;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateToIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateToIsoDateTime(date: Date): string {
  return `${dateToIsoDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isoToDisplayDate(iso: string): string {
  const [year, month, day] = iso.split("T")[0]?.split("-") ?? [];
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

function isoToDisplayDateTime(iso: string): string {
  const [datePart, timePart] = iso.split("T");
  const datePretty = isoToDisplayDate(datePart ?? "");
  return timePart ? `${datePretty} à ${timePart}` : datePretty;
}

function isoToDate(iso: string, fallback: Date): Date {
  if (!iso) return fallback;
  const normalized = iso.includes("T") ? iso : `${iso}T00:00`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

// Valeur de départ par défaut quand aucune valeur n'est encore choisie et
// qu'aucun `defaultDate` n'est fourni. `new Date()` (maintenant) posait un
// vrai problème d'UX pour une date de naissance : avec `maximumDate` fixé
// à aujourd'hui, descendre vers un mois plus tard dans l'année en cours
// visait une date future interdite, et le sélecteur "rebondissait" en
// arrière. Chaque appelant fournit donc désormais son propre `defaultDate`
// adapté à son cas (25 ans en arrière pour une naissance, demain pour un
// événement, etc.) ; celui-ci ne sert que de filet de sécurité générique.
function fallbackDefaultDate(): Date {
  return new Date();
}

function mergeDatePart(base: Date, datePart: Date): Date {
  const merged = new Date(base);
  merged.setFullYear(datePart.getFullYear(), datePart.getMonth(), datePart.getDate());
  return merged;
}

function mergeTimePart(base: Date, timePart: Date): Date {
  const merged = new Date(base);
  merged.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return merged;
}

// Sélecteur de date (ou date + heure) : ouvre un calendrier natif dans une
// modale plutôt que de laisser saisir une date libre au clavier (source
// d'erreurs de format constatée lors des tests utilisateurs).
export function DatePickerField({
  label,
  value,
  onChange,
  placeholder,
  hasError = false,
  mode = "date",
  minimumDate,
  maximumDate,
  defaultDate,
  testID,
}: DatePickerFieldProps) {
  const fallback = defaultDate ?? fallbackDefaultDate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date>(() => isoToDate(value, fallback));

  const openModal = () => {
    setPendingDate(isoToDate(value, fallback));
    setIsModalVisible(true);
  };

  const commit = (date: Date) => {
    onChange(mode === "datetime" ? dateToIsoDateTime(date) : dateToIsoDate(date));
  };

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    if (!selectedDate) {
      if (Platform.OS === "android") setIsModalVisible(false);
      return;
    }

    const merged = mergeDatePart(pendingDate, selectedDate);
    setPendingDate(merged);

    if (Platform.OS === "android" && mode === "date") {
      commit(merged);
      setIsModalVisible(false);
    }
  };

  const handleTimeChange = (_event: unknown, selectedTime?: Date) => {
    if (!selectedTime) return;
    setPendingDate((prev) => mergeTimePart(prev, selectedTime));
  };

  const handleValidate = () => {
    commit(pendingDate);
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    // Ferme la modale sans appeler onChange : la valeur existante n'est pas
    // modifiée (test utilisateur — impossible de sortir sans valider avant).
    setIsModalVisible(false);
  };

  const displayValue = value
    ? mode === "datetime"
      ? isoToDisplayDateTime(value)
      : isoToDisplayDate(value)
    : null;

  // En mode "date" sur Android, chaque sélection commit et referme déjà la
  // modale (pas besoin de boutons Annuler/Valider). En mode "datetime", les
  // deux platformes utilisent les boutons pour valider une fois date ET
  // heure choisies.
  const showActionButtons = mode === "datetime" || Platform.OS === "ios";

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        testID={testID}
        style={[styles.input, hasError && styles.inputError]}
        onPress={openModal}
        activeOpacity={0.7}
      >
        <Text style={value ? styles.value : styles.placeholder}>
          {displayValue ?? placeholder ?? "Sélectionner une date"}
        </Text>
      </TouchableOpacity>

      <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <DateTimePicker
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "calendar"}
              themeVariant="light"
              accentColor={Colors.primary}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              value={pendingDate}
              onChange={handleDateChange}
            />
            {mode === "datetime" ? (
              <DateTimePicker
                mode="time"
                display="spinner"
                themeVariant="light"
                accentColor={Colors.primary}
                value={pendingDate}
                onChange={handleTimeChange}
                style={styles.timePicker}
              />
            ) : null}
            {showActionButtons ? (
              <View style={styles.actionsRow}>
                <PrimaryButton
                  label="Annuler"
                  variant="outline"
                  onPress={handleCancel}
                  style={styles.actionButton}
                />
                <PrimaryButton
                  label="Valider"
                  onPress={handleValidate}
                  style={styles.actionButton}
                />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
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
    paddingVertical: 16,
    minHeight: 52,
    justifyContent: "center",
  },
  inputError: {
    borderColor: Colors.danger,
    borderWidth: 1.5,
  },
  value: {
    fontSize: 16,
    color: Colors.text,
  },
  placeholder: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(26, 20, 32, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    width: "90%",
  },
  timePicker: {
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
  },
});
