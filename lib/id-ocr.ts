import TextRecognition from "@react-native-ml-kit/text-recognition";

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

export type IdentityCheckResult = {
  ranOcr: boolean;
  nameFound: boolean;
  birthDateFound: boolean;
};

/**
 * Contrôle de cohérence GRATUIT et volontairement basique, pas une vraie
 * vérification d'identité (voir CLAUDE.md § Vérification d'identité) : de
 * l'OCR sur la photo du document, entièrement sur l'appareil (ML Kit, aucun
 * coût, aucun serveur tiers), pour voir si le nom/prénom et la date de
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
    const result = await TextRecognition.recognize(localUri);
    const normalizedText = normalize(result.text ?? "");

    const nameFound =
      normalizedText.includes(normalize(firstName)) && normalizedText.includes(normalize(lastName));

    const dateVariants = formatDateVariants(birthDateIso);
    const birthDateFound = dateVariants.some((variant) => normalizedText.includes(variant));

    return { ranOcr: true, nameFound, birthDateFound };
  } catch (error) {
    console.warn("[id-ocr] recognition failed:", error);
    return { ranOcr: false, nameFound: false, birthDateFound: false };
  }
}
