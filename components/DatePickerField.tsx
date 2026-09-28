import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors } from "../constants/colors";
import { PrimaryButton } from "./PrimaryButton";

type DatePickerFieldProps = {
  label: string;
  /** Date choisie au format ISO YYYY-MM-DD, ou chaîne vide si aucune. */
  value: string;
  /** Reçoit la date choisie au format ISO YYYY-MM-DD. */
  onChange: (isoDate: string) => void;
  placeholder?: string;
  hasError?: boolean;
};

function isoToDisplay(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

// Valeur de départ quand aucune date n'est encore choisie. `new Date()`
// (aujourd'hui) posait un vrai problème d'UX : avec `maximumDate` fixé à
// aujourd'hui, descendre vers un mois plus tard dans l'année en cours vise
// une date future interdite, et le sélecteur "rebondissait" en arrière —
// ça ressemblait à un bug. 25 ans en arrière est un point de départ
// plausible pour une date de naissance et laisse de la marge dans les deux
// sens (mois précédents ET suivants) avant de toucher une limite.
function defaultBirthDate(): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 25);
  return date;
}

function isoToDate(iso: string): Date {
  if (!iso) return defaultBirthDate();
  const parsed = new Date(`${iso}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? defaultBirthDate() : parsed;
}

function dateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Sélecteur de date de naissance : ouvre un calendrier natif dans une modale
// plutôt que de laisser saisir une date libre au clavier (source d'erreurs
// de format constatée lors des tests utilisateurs).
export function DatePickerField({ label, value, onChange, placeholder, hasError = false }: DatePickerFieldProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date>(() => isoToDate(value));

  const openModal = () => {
    setPendingDate(isoToDate(value));
    setIsModalVisible(true);
  };

  const handleChange = (_event: unknown, selectedDate?: Date) => {
    if (selectedDate) {
      setPendingDate(selectedDate);
      if (Platform.OS === "android") {
        onChange(dateToIso(selectedDate));
        setIsModalVisible(false);
      }
    } else if (Platform.OS === "android") {
      setIsModalVisible(false);
    }
  };

  const handleValidate = () => {
    onChange(dateToIso(pendingDate));
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    // Ferme la modale sans appeler onChange : la valeur existante n'est pas
    // modifiée (test utilisateur — impossible de sortir sans valider avant).
    setIsModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.input, hasError && styles.inputError]}
        onPress={openModal}
        activeOpacity={0.7}
      >
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? isoToDisplay(value) : placeholder ?? "Sélectionner ta date de naissance"}
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
              maximumDate={new Date()}
              value={pendingDate}
              onChange={handleChange}
            />
            {Platform.OS === "ios" ? (
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
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
  },
});
