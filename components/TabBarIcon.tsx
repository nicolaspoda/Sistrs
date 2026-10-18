import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View, type ColorValue } from "react-native";

import { Colors } from "../constants/colors";

type TabBarIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  color: ColorValue;
  size: number;
  focused: boolean;
  showDot?: boolean;
};

// Icône de la tab bar avec pastille rose "pilule" derrière l'onglet actif
// (maquette de design) + petit point rose en cas de nouveauté (demandes
// d'amies, nouveau contenu de canal, messages non lus...).
export function TabBarIcon({ name, color, size, focused, showDot = false }: TabBarIconProps) {
  return (
    <View style={[styles.pill, focused && styles.pillFocused]}>
      <Ionicons name={name} color={color} size={size} />
      {showDot ? <View style={styles.dot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: 40,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  pillFocused: {
    backgroundColor: Colors.primaryLight,
  },
  dot: {
    position: "absolute",
    top: 2,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
});
