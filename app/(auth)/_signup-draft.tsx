import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";

import type { AgeBracket, UserRole } from "../../lib/types";

// Données récoltées à l'étape 1 (sign-up.tsx) et complétées à l'étape 2
// (sign-up-preferences.tsx). Ce contexte ne vit que dans le groupe (auth) :
// il est remonté par app/(auth)/_layout.tsx et n'a pas besoin de persister
// au-delà du flow d'inscription (pas de AsyncStorage).
export interface SignUpDraft {
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  password: string;
  gender: string;
  role: UserRole;
  idDocumentUri: string | null;
  ageBracket: AgeBracket | null;
  categoryIds: string[];
  faceIdEnabled: boolean;
}

const emptyDraft: SignUpDraft = {
  firstName: "",
  lastName: "",
  birthDate: "",
  email: "",
  password: "",
  gender: "",
  role: "participant",
  idDocumentUri: null,
  ageBracket: null,
  categoryIds: [],
  faceIdEnabled: false,
};

interface SignUpDraftContextValue {
  draft: SignUpDraft;
  updateDraft: (patch: Partial<SignUpDraft>) => void;
  resetDraft: () => void;
}

const SignUpDraftContext = createContext<SignUpDraftContextValue | undefined>(undefined);

export function SignUpDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<SignUpDraft>(emptyDraft);

  const value = useMemo<SignUpDraftContextValue>(
    () => ({
      draft,
      updateDraft: (patch) => setDraft((prev) => ({ ...prev, ...patch })),
      resetDraft: () => setDraft(emptyDraft),
    }),
    [draft]
  );

  return <SignUpDraftContext.Provider value={value}>{children}</SignUpDraftContext.Provider>;
}

export function useSignUpDraft(): SignUpDraftContextValue {
  const context = useContext(SignUpDraftContext);
  if (!context) {
    throw new Error("useSignUpDraft must be used within a SignUpDraftProvider");
  }
  return context;
}
