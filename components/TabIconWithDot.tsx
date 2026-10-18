import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View, type ColorValue } from "react-native";

import { Colors } from "../constants/colors";

type TabIconWithDotProps = {
  name: keyof typeof Ionicons.glyphMap;
  color: ColorValue;
  size: number;
  showDot: boolean;
};

export function TabIconWithDot({ name, color, size, showDot }: TabIconWithDotProps) {
  return (
    <View>
      <Ionicons name={name} color={color} size={size} />
      {showDot ? <View style={styles.dot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: "absolute",
    top: -1,
    right: -3,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
});
