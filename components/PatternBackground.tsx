import type { PropsWithChildren } from "react";
import { ImageBackground, StyleSheet, type ViewStyle } from "react-native";

import { Colors } from "../constants/colors";

type PatternBackgroundProps = PropsWithChildren<{
  style?: ViewStyle;
}>;

// Fond rose clair avec motif léger (verres, étincelles) répété en mosaïque,
// utilisé derrière tous les écrans de l'app (voir ScreenContainer, et les
// écrans d'auth/formulaires qui ne passent pas par ScreenContainer) —
// reprend la maquette de design validée par l'utilisateur (fond rose clair
// + palette). Le tile `pattern-tile.png` contient déjà la couleur de fond,
// resizeMode="repeat" se contente de le juxtaposer sans déformation.
export function PatternBackground({ children, style }: PatternBackgroundProps) {
  return (
    <ImageBackground
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      source={require("../assets/images/pattern-tile.png")}
      resizeMode="repeat"
      style={[styles.fill, style]}
    >
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
