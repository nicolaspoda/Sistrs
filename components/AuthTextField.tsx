import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { Colors } from "../constants/colors";

type AuthTextFieldProps = TextInputProps & {
  label: string;
  hasError?: boolean;
};

export function AuthTextField({ label, style, hasError = false, ...inputProps }: AuthTextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, hasError && styles.inputError, style]}
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="none"
        {...inputProps}
      />
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
    fontSize: 16,
    color: Colors.text,
  },
  inputError: {
    borderColor: Colors.danger,
    borderWidth: 1.5,
  },
});
