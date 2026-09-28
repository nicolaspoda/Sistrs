# Sistrs — État d'avancement

> Ce fichier doit être mis à jour à la fin de chaque session de travail
> significative. Il est la source de vérité sur "où on en est" — à lire en
> entier avant de reprendre le travail, surtout après un changement de
> compte/session Claude Code.

Dernière mise à jour : 2026-09-28 (session : uploads réels, avis, push,
dev client, carte Mapbox, OCR pièce d'identité)

## Fait (session dev client + carte + push + OCR)

Couvre les manques identifiés en fin de session précédente + les décisions
prises avec l'utilisateur (dev client accepté, Mapbox, OCR gratuit plutôt
qu'un vrai KYC, filtre femmes déjà bon). **Rien de tout ceci n'a pu être
testé depuis ce sandbox** (VM Linux isolée, pas de Docker/Xcode/Android
Studio, accès registre npm inconstant) — voir la liste de commandes à
lancer localement à la fin de cette section.

- **Uploads réels vers Supabase Storage** : buckets `avatars` (public
  lecture) et `id-documents` (privé, propriétaire uniquement) créés via
  migration (`20260928050000_storage_buckets.sql`) avec policies sur
  `storage.objects` basées sur le préfixe de chemin `<profile_id>/...`.
  `lib/storage.ts` uploade via `fetch(uri).blob()` (pas besoin
  d'expo-file-system). L'avatar (`app/(tabs)/profile.tsx`) et la pièce
  d'identité (upload différé dans `AuthProvider.signUp`, une fois
  `auth.uid()` disponible) sont maintenant vraiment persistés.
- **Avis événements** : section "Avis" ajoutée sur `app/event/[id].tsx` —
  note moyenne + liste des avis (lecture ouverte), formulaire
  note/commentaire (upsert) pour une participante confirmée une fois
  l'événement terminé.
- **Notifications push (gratuites)** : colonne `profiles.push_token`,
  `lib/push-notifications.ts` (enregistrement du token Expo côté client,
  appelé depuis `AuthProvider` une fois le profil chargé), et un trigger SQL
  (`push_new_notification`, migration `20260928060000_push_notifications.sql`)
  qui appelle directement `https://exp.host/--/api/v2/push/send` via
  `pg_net` à chaque insertion dans `notifications` — donc pour tous les
  triggers `notify_*` existants, sans backend/Edge Function à déployer.
- **Passage à un development build** (`expo-dev-client` + `eas.json`) : Face
  ID réel et Mapbox ont tous les deux besoin de code natif qu'Expo Go ne
  peut pas fournir. Les scripts npm utilisent maintenant `expo start
  --dev-client` / `expo run:ios` / `expo run:android` au lieu du flux Expo
  Go. Les dossiers `ios/`/`android/` restent non commités (régénérés à la
  demande via `expo prebuild`, déjà dans `.gitignore`).
- **Carte interactive Mapbox** : `components/EventLocationMap.tsx`
  (`@rnmapbox/maps`) affichée sur le détail événement, juste au-dessus du
  bouton "Ouvrir dans Plans" (conservé pour l'itinéraire). Token public lu
  depuis `EXPO_PUBLIC_MAPBOX_TOKEN`.
- **Contrôle OCR gratuit sur la pièce d'identité** (décision explicite de
  l'utilisateur : pas de vrai KYC payant) : `lib/id-ocr.ts` fait de l'OCR
  sur l'appareil (`@react-native-ml-kit/text-recognition`, ML Kit, gratuit,
  sans serveur tiers) et vérifie si le nom/prénom/date de naissance saisis
  apparaissent dans le texte reconnu de la photo. Avertissement non
  bloquant sur `app/(auth)/sign-up.tsx` si ça ne correspond pas (un second
  appui sur "Continuer" passe outre) — ce n'est explicitement PAS une
  vérification d'identité (pas de MRZ, pas de comparaison faciale).
- **Filtre "femmes uniquement"** : vérifié avec l'utilisateur, déjà
  correctement en place (verrouillé en prod côté `AuthProvider.signUp`,
  ouvert en dev/staging) — aucune action nécessaire.
- **Face ID réel** : le code existant (`expo-local-authentication`,
  `NSFaceIDUsageDescription` dans `app.json`) n'a jamais eu besoin d'être
  réécrit — c'était bien une limitation d'Expo Go. Une fois le development
  build en place (voir ci-dessus), Face ID doit fonctionner nativement ;
  le lien "bypass développeur" reste disponible en dev/staging (utile en
  simulateur, qui n'a pas de capteur biométrique).

### À lancer sur le Mac (rien de testable depuis ce sandbox)

1. **Installer les nouvelles dépendances** (certaines n'ont pas pu être
   installées ici, accès registre npm bloqué par le sandbox) :
   ```
   npx expo install expo-file-system expo-notifications expo-dev-client @rnmapbox/maps @react-native-ml-kit/text-recognition
   ```
   (`expo-file-system` n'est en fait plus utilisé — `lib/storage.ts` s'en
   passe — mais autant vérifier qu'aucune autre dépendance manque avec
   `npx expo install --check`.)
2. **Appliquer les nouvelles migrations** : `supabase db reset` (ou
   `supabase migration up` si tu ne veux pas perdre des données locales
   déjà créées) pour les buckets Storage et le trigger push.
3. **Mapbox** : créer un compte gratuit sur mapbox.com, puis :
   - Token **public** (`pk.`, scope par défaut) → `EXPO_PUBLIC_MAPBOX_TOKEN`
     dans `.env`.
   - Token **secret** (`sk.`, scope "Downloads:Read") → à exporter comme
     variable d'environnement `RNMAPBOX_DOWNLOADS_TOKEN` avant `expo
     prebuild` (nécessaire pour télécharger le SDK natif Mapbox pendant le
     build). Ne jamais commettre ce token secret.
4. **EAS / projet Expo** : `npx eas init` (ou `npx eas login` puis `eas
   build:configure`) pour obtenir un `projectId` — nécessaire pour que
   `getExpoPushTokenAsync` fonctionne (push notifications).
5. **Générer et lancer le development build** :
   ```
   npx expo prebuild
   npx expo run:ios      # ou : npx eas build --profile development --platform ios
   ```
   Ensuite, au quotidien : `npx expo start --dev-client` (plus besoin
   d'Expo Go — l'app doit être relancée depuis le dev client installé).
6. **Tester dans l'ordre** : inscription (upload pièce d'identité + OCR),
   avatar profil, Face ID réel (inscription + inscription à un événement),
   carte sur le détail événement, avis après un événement passé,
   notification push reçue sur un autre compte/appareil.

## Fait

- **Application fonctionnelle de bout en bout** (auth + RLS + toutes les
  features des 5 onglets), construite en une session avec plusieurs
  sous-agents en parallèle sur des périmètres de fichiers disjoints (pas de
  conflit git à la fin) :
  - **Base de données** : migration `supabase/migrations/20260928010000_rls_and_triggers.sql`
    — RLS activée et policy par table (lecture globale aux authentifiées la
    plupart du temps, écriture restreinte au propriétaire de la ligne/du
    canal/de l'événement), + triggers : `updated_at` auto, auto-création du
    canal d'une organisatrice à la prise du rôle `organizer`, notifications
    in-app auto sur demande d'amie / amie acceptée / nouveau message /
    inscription confirmée (+ incrément `activity_count`) / nouveau sondage.
    **Correctif appliqué après coup** : la policy de lecture de
    `event_registrations` a été rendue ouverte à toute utilisatrice
    authentifiée (comme le reste du schéma), sinon le nombre de places
    restantes et les avatars des inscrites ne s'affichaient que pour
    l'inscrite elle-même ou l'organisatrice.
  - **Fondations** : `lib/types.ts` (types miroir de tout `supabase/schema.sql`),
    `lib/query-client.ts` (TanStack Query), `lib/auth/AuthProvider.tsx`
    (session + profil + `signUp`/`signIn`/`signOut`/`refreshProfile`, filtre
    "femmes uniquement" forcé côté `signUp` selon `EXPO_PUBLIC_ENV`), garde de
    navigation dans `app/_layout.tsx` (redirige vers `(auth)` si pas de
    session/profil, vers `(tabs)` sinon).
  - **Composants partagés** : `components/Avatar.tsx`, `EmptyState.tsx`,
    `ScreenContainer.tsx`, `PrimaryButton.tsx`, `AuthTextField.tsx` — réutilisés
    par tous les écrans, palette étendue dans `constants/colors.ts`.
  - **Authentification** : `app/(auth)/sign-in.tsx`, `sign-up.tsx` (infos +
    upload pièce d'identité local via `expo-image-picker`, pas encore uploadé
    vers Supabase Storage — TODO), `sign-up-preferences.tsx` (tranche d'âge,
    préférences/spécialités par catégories, activation Face ID via
    `expo-local-authentication`), état d'inscription partagé via
    `app/(auth)/_signup-draft.tsx`.
  - **Événements** (tab Accueil) : fil des événements à venir
    (`app/(tabs)/index.tsx`), détail + inscription avec confirmation Face ID
    + annulation + liste de courses pour l'organisatrice (`app/event/[id].tsx`),
    création d'événement pour les organisatrices (`app/event/create.tsx`).
  - **Amis** : demandes reçues / liste d'amies / recherche et ajout
    (`app/(tabs)/friends.tsx`).
  - **Canaux** : liste suivis/découvrir (`app/(tabs)/channels.tsx`), détail
    avec fil posts + sondages (vote, changement de vote), likes, création de
    post/sondage pour l'organisatrice (`app/channel/[id].tsx`).
  - **Messagerie** : liste des conversations (`app/(tabs)/messages.tsx`), chat
    en temps réel via Supabase Realtime avec résolution/création automatique
    de la conversation à partir d'un `profile_id` d'amie (`app/conversation/[id].tsx`).
  - **Profil** : vue/édition du profil connecté, déconnexion, badge de statut
    (`app/(tabs)/profile.tsx`), vue lecture seule du profil d'une autre
    personne (`app/profile/[id].tsx`), liste de notifications in-app
    (`app/notifications.tsx`).
  - **Décision carte** : pas de SDK de carte embarqué (Mapbox / Google Maps)
    pour l'instant — le lieu d'un événement s'ouvre via un lien natif
    ("Ouvrir dans Plans", `Linking.openURL`) plutôt qu'une carte interactive
    intégrée. Choix pragmatique pour rester testable directement dans Expo Go
    sans build natif custom ni clé API Google Maps. Voir CLAUDE.md — le choix
    Mapbox vs Google Maps reste ouvert si une carte interactive intégrée est
    voulue plus tard (nécessitera un dev client / `expo prebuild`).
  - **Dépendances ajoutées** à `package.json` (pas encore installées par
    l'utilisateur) : `@tanstack/react-query`, `expo-local-authentication`,
    `expo-image-picker`.

## Fait (session précédente)

- **Squelette du projet Expo mis en place** (à la racine du repo, pas de
  sous-dossier) :
  - Expo + React Native + TypeScript, navigation par Expo Router.
  - Bug corrigé au passage : le champ généré `profiles.status` castait mal
    ses littéraux texte vers l'enum `user_status` (`create table` échouait
    à l'application de la migration) — chaque branche du `case` est
    maintenant castée explicitement en `user_status`.
  - Structure de dossiers : `app/` (routes Expo Router, groupe `(tabs)`),
    `components/`, `lib/` (client Supabase dans `lib/supabase.ts`, lit
    `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`),
    `constants/` (couleurs de marque dans `constants/colors.ts`).
  - Navigation par onglets (5 sections : Accueil, Amis, Canaux, Messages,
    Profil) avec écrans placeholder (`components/PlaceholderScreen.tsx`).
  - `.env.example` (documente `EXPO_PUBLIC_ENV`,
    `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) et
    `.gitignore` adaptés Expo/RN/Supabase.
  - Vérifié : le bundler Metro compile sans erreur en web (953 modules) et
    en iOS (1343 modules) — `npx expo start` fonctionne.
- **Supabase en local via le CLI** (pas de projet cloud pour l'instant) :
  `supabase init` + migration initiale dans
  `supabase/migrations/20260928000000_initial_schema.sql` (copie de
  `supabase/schema.sql`, qui reste la source de vérité documentée dans
  `CLAUDE.md`). `supabase start` fonctionne via Docker Desktop (déjà
  installé et lancé sur la machine de l'utilisateur).
  **Ports décalés dans `supabase/config.toml`** (55321/55322/55323/55324/
  55327/55329 au lieu des ports par défaut 543xx) car un autre projet
  Supabase local (`burnout-app`) tournait déjà sur cette machine et
  occupait les ports par défaut — à garder en tête si le projet est cloné
  sur une autre machine sans ce conflit (les ports par défaut
  fonctionneraient aussi, mais autant rester cohérent).
  Un fichier `.env` local (non commité) a été créé avec l'URL et la clé
  publiable de l'instance locale — à régénérer via `supabase status` si
  l'instance est recréée.

## Fait (sessions précédentes)

- **Nom du produit** : Sistrs (nom de code "Rosie" utilisé au tout début,
  abandonné).
- **Stack technique tranchée** : React Native + Expo, Supabase, TanStack
  Query, expo-local-authentication. Voir `CLAUDE.md` pour le détail.
- **Décision vérification d'identité** : pas de prestataire KYC payant pour
  l'instant (budget = 0€ au démarrage). Recherché et chiffré Stripe Identity
  (1,50 $/vérification, 50 gratuites, pas d'engagement mini) si besoin plus
  tard. Face ID natif uniquement pour l'instant — gratuit mais ne vérifie
  pas l'identité réelle.
- **Décision filtre "femmes uniquement"** : géré par variable
  d'environnement (dev/staging accepte tout genre pour permettre au
  développeur de tester, prod verrouille strictement sur "femme"). Pas de
  compte admin permanent en prod. Voir `CLAUDE.md`.
- **Schéma de base de données** : première version écrite dans
  `supabase/schema.sql` (à committer/vérifier qu'il est bien dans le repo).
  Couvre : profiles, categories, channels, events, event_registrations,
  event_shopping_list_items, event_reviews, channel_posts + likes, polls +
  options + votes, friendships, conversations + messages, notifications.
  Inclut le champ `gender` sur `profiles` (déclaratif, non contraint en
  base — voir `CLAUDE.md`).
- **Maquette Figma** : fichier créé ("Rosie - App événements entre filles",
  file_key `NVfRLxNqqJjL9DfbP9InpF`). Écrans réalisés et vérifiés visuellement :
  - Inscription 1 — Informations (infos perso, upload pièce d'identité, choix participante/organisatrice)
  - Inscription 2 — Face ID & préférences (tranche d'âge, préférences max 5)
  - Connexion — Face ID (écran de vérification avec mouvements de tête simulés visuellement)
  - Demandes d'amis (confirmer/supprimer)
  - Canaux (liste des canaux suivis)
  Écrans **pas encore refaits/terminés** (le quota API Figma MCP du plan
  Starter a été atteint en cours de route, plusieurs tentatives ont échoué
  après coup) :
  - Accueil / fil d'actualité (une version existe mais à revalider)
  - Détail événement + inscription avec Face ID
  - Création d'événement (formulaire organisateur)
  - Canal individuel + sondage
  - Messagerie (liste + conversation) — une version tentée, pas confirmée
  - Profil utilisateur + Profil organisateur — une version tentée, pas confirmée
  - Illustration de marque (verres qui trinquent) reçue de l'utilisateur et
    retravaillée avec des traits plus épais.
- **Repo GitHub créé** : `nicolaspoda/sistrs` (privé), vide au moment de la
  création. Cloné et attaché à la session Claude Code.
- **Environnement dev local** : Claude Code CLI installé avec succès sur le
  Mac de l'utilisateur après résolution d'une erreur `ENOTEMPTY` npm.

## En cours / à faire ensuite

1. **Avant de tester** : voir la liste de commandes juste au-dessus
   ("À lancer sur le Mac") — installer les nouvelles dépendances natives,
   appliquer les migrations, configurer Mapbox/EAS, puis générer le
   development build. Le flux "juste `expo start` + Expo Go" ne fonctionne
   plus depuis cette session (voir décision dev client ci-dessus).
2. ~~Uploads réels~~ **fait cette session** (Supabase Storage).
3. ~~Notifications push~~ **fait cette session** (API push Expo via pg_net).
4. ~~Carte interactive~~ **fait cette session** (Mapbox, nécessite le dev
   client + un token).
5. **Tests fonctionnels manuels** : à faire par l'utilisateur sur son Mac,
   cette fois sur le development build (plus Expo Go) — flux complet à
   valider : inscription (participante ET organisatrice, avec OCR pièce
   d'identité et upload réel) → création de canal auto → création d'un
   événement (organisatrice, carte Mapbox visible) → découverte +
   inscription avec Face ID réel (participante) → demande d'amie →
   message → post/sondage dans un canal → avis après un événement passé →
   réception d'une notification push sur un second compte.
6. **Écrans Figma manquants** : toujours non repris (accueil/fil, détail
   événement, création événement, canal individuel, messagerie, profils) —
   l'app a été construite directement en code avec un design simple dans la
   palette de marque plutôt qu'en repartant des maquettes, comme demandé.
7. **RLS à revisiter** : les policies actuelles privilégient la simplicité
   (lecture large aux authentifiées) plutôt qu'une confidentialité stricte
   (ex. n'importe quelle utilisatrice connectée peut lister tous les profils,
   voir qui est inscrite à un événement, qui a liké/voté). À resserrer si le
   produit évolue vers plus de confidentialité.

## Décisions à ne pas reproposer (déjà tranchées)

- Pas de vérification d'identité tierce payante pour l'instant → ne pas
  reproposer Stripe Identity/Sumsub sans que l'utilisateur en parle
  lui-même.
- Pas de compte admin bypass permanent en production pour l'accès
  développeur → dev/staging uniquement.
- Nom du produit = Sistrs, pas Rosie.
