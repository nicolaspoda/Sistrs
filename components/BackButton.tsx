import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, TouchableOpacity, type ViewStyle } from "react-native";

import { Colors } from "../constants/colors";

type BackButtonProps = {
  style?: ViewStyle;
  fallbackHref?: string;
};

// Bouton retour réutilisable pour les écrans hors des groupes (tabs)/(auth)
// (détail événement, canal, conversation, profil...), qui n'ont pas de
// header de navigation natif. `router.back()` fonctionne dans la grande
// majorité des cas (l'écran a été ouvert par push), mais si l'écran est
// ouvert directement (deep link, ouverture après reload), il n'y a rien
// dans l'historique à dépiler — on retombe alors sur `fallbackHref`.
export function BackButton({ style, fallbackHref = "/(tabs)" }: BackButtonProps) {
  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackHref as never);
    }
  };

  return (
    <TouchableOpacity style={[styles.backButton, style]} onPress={handlePress} activeOpacity={0.7}>
      <Ionicons name="chevron-back" size={22} color={Colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
});
