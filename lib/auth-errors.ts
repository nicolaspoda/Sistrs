// Traduit les messages d'erreur bruts renvoyés par Supabase Auth (GoTrue,
// toujours en anglais) vers un message utilisateur en français. Les
// messages inconnus retombent sur un message générique plutôt que
// d'afficher l'anglais brut.
export function translateAuthError(rawMessage: string | undefined | null): string {
  const message = (rawMessage ?? "").toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (message.includes("email not confirmed")) {
    return "Ton email n'est pas encore confirmé.";
  }
  if (message.includes("user already registered") || message.includes("already been registered")) {
    return "Un compte existe déjà avec cet email.";
  }
  if (message.includes("password should be at least")) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }
  if (message.includes("unable to validate email address") || message.includes("invalid email")) {
    return "Adresse email invalide.";
  }
  if (message.includes("network request failed") || message.includes("fetch failed")) {
    return "Impossible de contacter le serveur. Vérifie ta connexion.";
  }
  if (message.includes("rate limit")) {
    return "Trop de tentatives. Réessaie dans quelques minutes.";
  }

  return "Une erreur est survenue. Réessaie.";
}
