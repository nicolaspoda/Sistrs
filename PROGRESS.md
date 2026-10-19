# Sistrs — État d'avancement

> Ce fichier doit être mis à jour à la fin de chaque session de travail
> significative. Il est la source de vérité sur "où on en est" — à lire en
> entier avant de reprendre le travail, surtout après un changement de
> compte/session Claude Code.

Dernière mise à jour : 2026-10-19 (session : flow Maestro event-create-and-register
ajouté, bug des dates par défaut de création d'événement corrigé)

## Fait (session pipeline autonome — 2e run réel)

- **`.maestro/event-create-and-register.yaml` écrit** (item 2 du backlog
  "Flows Maestro manquants" ci-dessous, à la suite du run précédent qui a
  traité l'item 1 — voir PR #2, toujours ouverte au moment d'écrire ceci,
  pas encore mergée). Parcours complet : une organisatrice crée un compte,
  crée un événement (titre/description/catégorie/lieu/dates par défaut/
  2 places max), ajoute un article à sa liste de courses, se déconnecte ;
  une participante crée un compte, découvre l'événement dans le fil et s'y
  inscrit (pas de lien "bypass Face ID" nécessaire ici contrairement à
  l'inscription — `handleRegister` dans `app/event/[id].tsx` continue déjà
  tout seul si `authenticateAsync()` échoue hors production). Vérifie que
  le compteur de places passe de "2 places restantes sur 2" à "1 place
  restante sur 2" après l'inscription, et que l'article de liste de
  courses apparaît bien. Ajouté à `scripts/run-maestro-suite.sh` (deux
  comptes générés à la volée, indépendants des autres flows).
  **Testé statiquement seulement** (comme le run précédent) : le fichier
  YAML parse comme deux documents valides (`pyyaml`), et le script a été
  dry-runné avec un faux binaire `maestro` pour vérifier le câblage
  (variables d'env distinctes pour l'organisatrice et la participante) —
  pas d'exécution réelle sur Simulator, voir le point suivant.
- **Bug trouvé et corrigé en écrivant ce flow** : dans
  `app/event/create.tsx`, `defaultStartDate()` (demain 19h) et
  `defaultDeadlineDate()` (après-demain 19h) étaient inversées par rapport
  à leur usage — la date limite d'inscription par défaut tombait donc
  *après* le début de l'événement au lieu d'au moins 24h avant, ce qui
  faisait échouer la validation côté client ("La date limite d'inscription
  doit être au moins 24h avant le début.") à chaque création d'événement
  où une organisatrice acceptait les deux dates pré-sélectionnées sans les
  changer manuellement — ce qui est précisément ce que fait (et doit
  pouvoir faire) un flow Maestro, qui ne pilote pas le calendrier natif
  par coordonnées. Corrigé en échangeant les décalages de jours (début =
  après-demain, date limite = demain), ce qui respecte l'écart d'exactement
  24h exigé par la contrainte SQL `registration_deadline <= start_at - 24h`
  (vérifié : la comparaison de `handleSubmit` utilise un `>` strict, donc
  une égalité à 24h passe). **Bug réel, pas seulement un problème de test**
  — à signaler/vérifier manuellement sur le Mac si l'utilisatrice avait
  déjà rencontré cette erreur sans comprendre pourquoi.
- **TestID ajoutés** (nécessaires pour que Maestro puisse cibler les
  éléments de façon fiable, sur le même principe que les écrans
  d'inscription) : `app/event/create.tsx` (`input-event-title`,
  `input-event-description`, `date-picker-event-start`,
  `input-event-meeting-point`, `input-event-max-participants`,
  `date-picker-event-deadline`, `button-publish-event`),
  `app/(tabs)/index.tsx` (`button-create-event` sur le bouton "+"),
  `app/event/[id].tsx` (`button-register-event`,
  `button-cancel-registration`, `input-add-shopping-item`,
  `button-add-shopping-item`), `app/(tabs)/profile.tsx`
  (`button-sign-out`). Aucun de ces écrans n'avait de testID avant cette
  session — seuls les écrans d'authentification en avaient.
- **Mac joignable mais toujours aucun dossier connecté à cette session**
  (comme au run précédent) : `get_device_info` répond, mais
  `connectedFolders` est vide. Branche B (test E2E réel sur Simulator)
  donc non tentée à nouveau ce run, pour la même raison qu'au run
  précédent — pas de changement côté utilisateur depuis. Le marqueur
  "Dernier run E2E vert" reste donc inchangé.

## Fait (session Supabase cloud + pipeline autonome)

- **Projet Supabase cloud créé** : `sistrs` (ref `grwwoigglxuqkgzvijky`, région
  `eu-west-1`, org "nicolaspoda's Org"). Jusqu'ici le projet ne tournait
  qu'en local via le CLI/Docker — voir section plus bas. Les deux coexistent
  maintenant : local pour le dev quotidien sur le Mac, cloud pour le
  pipeline automatisé (pas de Docker disponible dans le sandbox cloud).
  **Toutes les migrations existantes appliquées dans l'ordre** :
  `initial_schema`, `rls_and_triggers` (RLS + policies sur les 19 tables +
  tous les triggers), `seed_categories`, `categories_public_read` (appliquée
  via `alter policy ... to anon, authenticated` plutôt que le
  drop+create de la migration d'origine — même effet, la policy a juste
  gardé son nom `categories_select_authenticated` au lieu d'être renommée
  `categories_select_public`), `channel_last_viewed`, `storage_buckets`
  (buckets `avatars` + `id-documents` avec policies), `push_notifications`
  (colonne `push_token`, extension `pg_net`, trigger d'envoi push).
  Advisories de sécurité vérifiées après coup : propre (seul `spatial_ref_sys`,
  une table système PostGIS, remonte en RLS désactivée — normal, hors de
  notre contrôle).
  **Pas encore fait** : remplir `EXPO_PUBLIC_SUPABASE_URL`/`_ANON_KEY` avec
  les valeurs du projet cloud côté app — le `.env` du Mac pointe encore sur
  l'instance locale (`http://127.0.0.1:55321`). À décider : garder le flux
  local pour le dev quotidien et ne brancher le cloud que pour les tests
  automatisés, ou basculer complètement.
- **Pipeline de développement autonome mis en place** : une tâche planifiée
  tourne côté cloud (actuellement désactivée le temps de stabiliser la
  synchro avec le repo local, à réactiver), lit ce fichier et `CLAUDE.md`,
  prend une tâche de la liste ci-dessous, code, teste, ouvre une PR.
  **Point de vigilance identifié** : le connecteur Supabase MCP n'est pas
  encore attaché à la session de cette tâche planifiée — tant que ce n'est
  pas réglé, elle ne peut pas elle-même appliquer de nouvelles migrations.

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
- **Supabase en local via le CLI** (mise à jour 2026-10-19 : un projet cloud
  existe maintenant aussi, voir plus haut — ce qui suit décrit l'instance
  locale Docker, toujours utilisée pour le dev quotidien) :
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

## Pipeline dev → test E2E → fix en boucle (décision 2026-10-19)

- **Décision architecture tests** : pas de sandbox/simulateur EAS cloud
  (facturé, quota flou côté minutes de simulateur sur le plan Free). À la
  place, la tâche planifiée pilote le **Mac de l'utilisateur** via le pont
  "remote-devices" (`device_bash` + les tools `computer_*`/simulateur local
  déjà installé) : build dev-client déjà existant, Simulator iOS local,
  Maestro CLI local (`scripts/run-maestro-suite.sh`). **Coût : 0€**, à
  condition que le Mac reste allumé, déverrouillé, avec l'app Claude
  desktop ouverte au moment où la tâche planifiée se déclenche — sinon ce
  run-là n'a simplement pas accès au Mac (pas d'erreur bloquante, juste pas
  de test E2E possible ce coup-ci ; la partie "dev" seule n'a pas besoin du
  Mac).
- **Rebuild du dev-client** : seulement si un correctif touche du code
  natif (nouvelle dépendance native, changement `app.json`/plugins,
  permissions). Les correctifs JS/TS classiques sont testés en rechargeant
  le bundle Metro sur le build déjà installé, sans rebuild.
- **Marqueur anti-répétition inutile** : avant de relancer toute la suite
  Maestro, la tâche planifiée compare le commit `main` actuel au dernier
  "run E2E" enregistré ci-dessous. Si identique, elle passe directement à
  une tâche de dev (ou s'arrête si le backlog dev est aussi vide) plutôt
  que de relancer le Simulator pour rien.
  - **Dernier run E2E vert enregistré** : aucun pour l'instant (jamais
    lancé via le pipeline).
- **Backlog flows Maestro manquants** (objectif utilisateur : couverture de
  l'app entière, pas seulement signup/login/smoke navigation déjà
  existants) — à traiter comme des tâches de dev normales, dans cet ordre
  de priorité suggéré :
  1. `signup-organizer.yaml` — inscription côté organisatrice (rôle
     `organizer`, création auto du canal). **Écrit, PR #2 ouverte, pas
     encore mergée au moment d'écrire ceci** — pas encore exécuté pour de
     vrai sur Simulator (Mac non connecté lors de ce run-là non plus).
  2. ~~`event-create-and-register.yaml`~~ **fait le 2026-10-19** (voir
     section "Fait (session pipeline autonome — 2e run réel)" plus haut) —
     écrit et câblé dans le script, pas encore exécuté pour de vrai sur
     Simulator (Mac non connecté à ce run non plus). A aussi permis de
     trouver et corriger un vrai bug (dates par défaut de création
     d'événement inversées, voir plus haut).
  3. `friend-request-flow.yaml` — envoi réel d'une demande d'amie (pas
     juste lecture d'une demande seedée) + acceptation côté second compte.
  4. `messaging-send.yaml` — envoi réel d'un message dans une conversation
     (pas juste lecture du badge "non lu" seedé).
  5. `channel-post-and-poll.yaml` — organisatrice crée un post + un sondage
     dans son canal, participante vote.
  6. `event-review.yaml` — avis (note + commentaire) sur un événement
     passé.
  7. `notifications.yaml` — vérifie qu'une notification in-app apparaît
     après une des actions ci-dessus (demande d'amie, inscription
     confirmée...).
  8. `profile-edit-avatar.yaml` — modification du profil + upload avatar
     réel vers Storage.
  Chaque nouveau flow doit être ajouté à `scripts/run-maestro-suite.sh` et
  à la liste lue par la tâche planifiée.
- **Backlog "prêt pour le store"** (distinct des tests, à ne traiter
  qu'une fois la couverture E2E ci-dessus avancée) : politique de
  confidentialité (obligatoire — l'app traite genre + pièce d'identité),
  fiches App Store/Play Store (description, captures d'écran, catégorie
  d'âge), comptes développeur Apple (99$/an) et Google Play (25$ une fois)
  si pas déjà créés, configuration EAS Submit. **Décision en attente de
  l'utilisateur** : ces comptes développeur payants ne doivent pas être
  créés automatiquement par le pipeline — à confirmer explicitement le
  moment venu.

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
