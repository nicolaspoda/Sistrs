import { recognizeTextAsync } from "../modules/vision-text-recognition";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .toUpperCase();
}

function formatDateVariants(isoDate: string): string[] {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return [];
  return [
    `${day}/${month}/${year}`,
    `${day}.${month}.${year}`,
    `${day}-${month}-${year}`,
    `${year}-${month}-${day}`,
    `${day}${month}${year}`,
  ];
}

/**
 * Variantes de la date en "chiffres seulement" (JJMMAAAA et JJMMAA), pour
 * matcher même quand l'OCR déforme les séparateurs (point manquant,
 * remplacé par un espace, etc. — ex. "11.12 2003" au lieu de "11.12.2003").
 * On compare alors des suites de chiffres plutôt que des chaînes exactes.
 */
function digitsOnlyDateVariants(isoDate: string): string[] {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return [];
  const shortYear = year.slice(-2);
  return [`${day}${month}${year}`, `${day}${month}${shortYear}`, `${year}${month}${day}`];
}

function digitsOnly(text: string): string {
  return text.replace(/[^0-9]/g, "");
}

export type IdentityCheckResult = {
  ranOcr: boolean;
  nameFound: boolean;
  birthDateFound: boolean;
};

/**
 * Contrôle de cohérence GRATUIT et volontairement basique, pas une vraie
 * vérification d'identité (voir CLAUDE.md § Vérification d'identité) : de
 * l'OCR sur la photo du document, entièrement sur l'appareil (framework Vision
 * d'Apple, aucun coût, aucun serveur tiers), pour voir si le nom/prénom et la date de
 * naissance saisis à l'inscription apparaissent dans le texte reconnu.
 *
 * Pas de lecture de MRZ, pas de comparaison faciale, pas de garantie contre
 * un document falsifié ou appartenant à quelqu'un d'autre — juste "ces mots
 * apparaissent-ils sur la photo fournie". Faux négatifs attendus (mauvaise
 * qualité photo, ordre nom/prénom différent, glare…) : ne doit donc jamais
 * bloquer la création de compte, seulement avertir.
 */
export async function checkIdDocumentAsync(
  localUri: string,
  firstName: string,
  lastName: string,
  birthDateIso: string
): Promise<IdentityCheckResult> {
  try {
    const recognizedText = await recognizeTextAsync(localUri);
    const normalizedText = normalize(recognizedText ?? "");

    const nameFound =
      normalizedText.includes(normalize(firstName)) && normalizedText.includes(normalize(lastName));

    const dateVariants = formatDateVariants(birthDateIso);
    const normalizedDigits = digitsOnly(normalizedText);
    const birthDateFound =
      dateVariants.some((variant) => normalizedText.includes(variant)) ||
      digitsOnlyDateVariants(birthDateIso).some((variant) => normalizedDigits.includes(variant));

    // TEMP DEBUG (à retirer une fois le souci de reconnaissance diagnostiqué) :
    // affiche le texte brut détecté par l'OCR pour comprendre les faux négatifs.
    console.log("[id-ocr] texte brut détecté :", JSON.stringify(recognizedText));
    console.log("[id-ocr] texte normalisé :", normalizedText);
    console.log("[id-ocr] prénom/nom recherchés :", normalize(firstName), "/", normalize(lastName), "-> trouvés:", nameFound);
    console.log("[id-ocr] variantes de date recherchées :", dateVariants, "-> trouvée:", birthDateFound);

    return { ranOcr: true, nameFound, birthDateFound };
  } catch (error) {
    console.warn("[id-ocr] recognition failed:", error);
    return { ranOcr: false, nameFound: false, birthDateFound: false };
  }
}
