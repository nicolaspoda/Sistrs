import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from "react-native";

import { Colors } from "../constants/colors";

type PrimaryButtonProps = TouchableOpacityProps & {
  label: string;
  isLoading?: boolean;
  variant?: "primary" | "outline";
};

export function PrimaryButton({
  label,
  isLoading = false,
  variant = "primary",
  style,
  disabled,
  ...touchableProps
}: PrimaryButtonProps) {
  const isOutline = variant === "outline";

  return (
    <TouchableOpacity
      style={[styles.base, isOutline ? styles.outline : styles.primary, disabled && styles.disabled, style]}
      disabled={disabled || isLoading}
      activeOpacity={0.85}
      {...touchableProps}
    >
      {isLoading ? (
        <ActivityIndicator color={isOutline ? Colors.primary : Colors.white} />
      ) : (
        <Text style={isOutline ? styles.outlineLabel : styles.primaryLabel}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  outline: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  disabled: {
    opacity: 0.6,
  },
  primaryLabel: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  outlineLabel: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
});
