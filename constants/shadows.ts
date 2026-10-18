import { Platform } from "react-native";

// Ombre douce réutilisée sur les cartes (profil, canaux, amies, messages...)
// pour donner du relief sans casser le fond à motif. shadow* pour iOS,
// elevation pour Android.
export const CardShadow = Platform.select({
  ios: {
    shadowColor: "#B4367B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  android: {
    elevation: 3,
  },
  default: {},
});

// Variante plus marquée pour les éléments qu'on veut faire ressortir
// davantage (carte d'avatar en tête de profil, CTA...).
export const RaisedShadow = Platform.select({
  ios: {
    shadowColor: "#B4367B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
  },
  android: {
    elevation: 6,
  },
  default: {},
});
