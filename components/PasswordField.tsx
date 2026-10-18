import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, type TextInputProps } from "react-native";

import { Colors } from "../constants/colors";

type PasswordFieldProps = Omit<TextInputProps, "secureTextEntry"> & {
  label: string;
  hasError?: boolean;
};

// Champ mot de passe réutilisable avec bouton oeil pour afficher/masquer la
// saisie. Basé sur le même style que AuthTextField (composants distincts
// pour que TextInputProps de AuthTextField reste sans le toggle).
export function PasswordField({ label, style, hasError = false, testID, ...inputProps }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, hasError && styles.inputRowError]}>
        <TextInput
          testID={testID}
          style={[styles.input, style]}
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          secureTextEntry={!isVisible}
          {...inputProps}
        />
        <TouchableOpacity
          testID={testID ? `${testID}-toggle-visibility` : undefined}
          style={styles.eyeButton}
          onPress={() => setIsVisible((prev) => !prev)}
          activeOpacity={0.7}
        >
          <Ionicons name={isVisible ? "eye-off" : "eye"} size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
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
  inputRow: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  inputRowError: {
    borderColor: Colors.danger,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
    minHeight: 52,
    fontSize: 16,
    color: Colors.text,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
});
