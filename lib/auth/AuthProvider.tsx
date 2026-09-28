import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { uploadImageAsync } from "../storage";
import { supabase } from "../supabase";
import type { Profile } from "../types";

// Champs nécessaires pour créer un profil à l'inscription. Les colonnes
// gérées par la base (id, activity_count, status, created_at, updated_at)
// ne sont pas incluses ici.
export type SignUpProfileData = Pick<
  Profile,
  "first_name" | "last_name" | "birth_date" | "gender" | "age_bracket" | "role"
> &
  Partial<Pick<Profile, "bio" | "avatar_url" | "banner_url" | "id_document_url" | "face_id_enabled">>;

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signUp: (email: string, password: string, profileData: SignUpProfileData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Profile | null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const nextProfile = await fetchProfile(userId);
    setProfile(nextProfile);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user.id) {
      setProfile(null);
      return;
    }
    await loadProfile(session.user.id);
  }, [session?.user.id, loadProfile]);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      setSession(initialSession);

      if (initialSession?.user.id) {
        try {
          await loadProfile(initialSession.user.id);
        } catch {
          // Le profil sera re-tenté au prochain refreshProfile / changement d'état.
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (nextSession?.user.id) {
        loadProfile(nextSession.user.id).catch(() => setProfile(null));
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback(
    async (email: string, password: string, profileData: SignUpProfileData) => {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        throw error;
      }

      const userId = data.user?.id;
      if (!userId) {
        throw new Error("Sign-up succeeded but no user id was returned.");
      }

      // Filtre "femmes uniquement" — appliqué ici, côté client, jamais en
      // base (voir CLAUDE.md § Décisions de sécurité). En production, la
      // valeur du champ genre est toujours forcée à "femme" quoi que le
      // formulaire ait transmis.
      const gender = process.env.EXPO_PUBLIC_ENV === "production" ? "femme" : profileData.gender;

      // Le document d'identité choisi à l'étape 1 n'est qu'une URI locale
      // (`file://…`) tant qu'aucune session n'existe. Une fois le compte
      // créé ci-dessus, on a un `auth.uid()` valide : on peut donc l'uploader
      // vers le bucket privé `id-documents` avant de créer le profil.
      let idDocumentUrl = profileData.id_document_url ?? null;
      if (idDocumentUrl && idDocumentUrl.startsWith("file")) {
        try {
          idDocumentUrl = await uploadImageAsync(idDocumentUrl, "id-documents", userId);
        } catch (uploadError) {
          // Ne bloque pas la création du compte pour un problème de
          // stockage : le document reste simplement absent plutôt que de
          // faire échouer toute l'inscription.
          console.error("[signUp] id document upload failed:", uploadError);
          idDocumentUrl = null;
        }
      }

      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        birth_date: profileData.birth_date,
        gender,
        age_bracket: profileData.age_bracket,
        role: profileData.role,
        bio: profileData.bio ?? null,
        avatar_url: profileData.avatar_url ?? null,
        banner_url: profileData.banner_url ?? null,
        id_document_url: idDocumentUrl,
        face_id_enabled: profileData.face_id_enabled ?? false,
      });

      if (profileError) {
        throw profileError;
      }

      await loadProfile(userId);
    },
    [loadProfile]
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, profile, isLoading, signUp, signIn, signOut, refreshProfile }),
    [session, profile, isLoading, signUp, signIn, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
