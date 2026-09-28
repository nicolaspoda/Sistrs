import { supabase } from "./supabase";

export type UploadBucket = "avatars" | "id-documents";

// `avatars` est un bucket public (les avatars sont affichés à toute
// utilisatrice) : on renvoie une URL publique stable. `id-documents` est
// privé (donnée sensible, personne d'autre que l'utilisatrice ne doit
// pouvoir y accéder) : on renvoie une URL signée à très longue durée de vie
// (10 ans) plutôt qu'une URL publique, faute d'écran de consultation qui
// justifierait de régénérer une URL signée à la demande.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;

function extensionFromUri(uri: string): string {
  const withoutQuery = uri.split("?")[0];
  const match = withoutQuery.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : "jpg";
}

function contentTypeFromExtension(extension: string): string {
  switch (extension) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "pdf":
      return "application/pdf";
    default:
      return "image/jpeg";
  }
}

/**
 * Upload une image locale (URI `file://` renvoyée par expo-image-picker)
 * vers un bucket Supabase Storage, et renvoie son URL (publique pour
 * `avatars`, signée longue durée pour `id-documents`).
 *
 * Pas besoin d'expo-file-system ni de lib de décodage base64 : le `fetch`
 * intégré à Expo/React Native sait lire un `file://` local et le convertir
 * en `Blob`, que le client Supabase accepte directement pour l'upload.
 */
export async function uploadImageAsync(
  localUri: string,
  bucket: UploadBucket,
  ownerId: string
): Promise<string> {
  const extension = extensionFromUri(localUri);
  const path = `${ownerId}/${Date.now()}.${extension}`;

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: contentTypeFromExtension(extension),
    upsert: true,
  });

  if (uploadError) {
    throw uploadError;
  }

  if (bucket === "avatars") {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  const { data, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (signError || !data) {
    throw signError ?? new Error("Impossible de générer une URL pour le document.");
  }

  return data.signedUrl;
}
