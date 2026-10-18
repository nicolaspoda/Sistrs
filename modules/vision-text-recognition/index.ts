import { requireNativeModule } from "expo-modules-core";

type VisionTextRecognitionNativeModule = {
  recognizeText(uri: string): Promise<string>;
};

const nativeModule = requireNativeModule<VisionTextRecognitionNativeModule>("VisionTextRecognition");

/**
 * OCR local via Vision (Apple), fonctionne sur device ET simulateur.
 * `uri` est une URI locale de fichier (ex. résultat d'expo-image-picker).
 * Retourne le texte brut reconnu (une ligne par ligne détectée).
 */
export async function recognizeTextAsync(uri: string): Promise<string> {
  return nativeModule.recognizeText(uri);
}
