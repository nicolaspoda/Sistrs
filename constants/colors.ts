export const Colors = {
  primary: "#ED3C7B",
  primaryDark: "#C22C61",
  primaryLight: "#FBE1EB",
  white: "#FFFFFF",
  black: "#1A1420",
  text: "#2B2230",
  // Assombri par rapport à la version initiale (#8A7F8C) : sur le
  // nouveau fond à motif, un gris trop clair se lisait mal.
  textMuted: "#6B5B70",
  border: "#EFE2E8",
  // Rose clair de la maquette de design (fond répété avec motif de verres) —
  // voir components/PatternBackground.tsx.
  background: "#FDE4EE",
  surface: "#FFFFFF",
  success: "#3FAE7A",
  danger: "#E4483F",
  warning: "#E8A93C",
  // Bleu lavande utilisé pour le cercle du bouton retour (maquette de design).
  accentBlue: "#D9E2FA",
} as const;
