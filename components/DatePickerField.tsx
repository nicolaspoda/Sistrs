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
};

function isoToDisplay(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

function isoToDate(iso: string): Date {
  if (!iso) return new Date();
  const parsed = new Date(`${iso}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
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
export function DatePickerField({ label, value, onChange, placeholder }: DatePickerFieldProps) {
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

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={openModal} activeOpacity={0.7}>
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
              maximumDate={new Date()}
              value={pendingDate}
              onChange={handleChange}
            />
            {Platform.OS === "ios" ? (
              <PrimaryButton label="Valider" onPress={handleValidate} style={styles.validateButton} />
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
  validateButton: {
    marginTop: 12,
  },
});
