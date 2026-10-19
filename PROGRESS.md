# Sistrs — État d'avancement

> Ce fichier doit être mis à jour à la fin de chaque session de travail
> significative. Il est la source de vérité sur "où on en est" — à lire en
> entier avant de reprendre le travail, surtout après un changement de
> compte/session Claude Code. **Historique complet des sessions passées** :
> `PROGRESS_ARCHIVE.md` (déplacé là pour garder ce fichier court — le lire
> seulement si un détail précis d'une session passée est nécessaire).

Dernière mise à jour : 2026-10-19 (tentative de vérification backend du
trigger push `trg_push_new_notification` — bloquée, voir ci-dessous ; RLS
resserrée — item "RLS à revisiter" traité run précédent ; trois autres runs
concurrents précédents — channel-discover-subscribe, signup-ocr-mismatch-
warning, test EventLocationMap — détail complet archivé dans
PROGRESS_ARCHIVE.md)

## Trigger push `trg_push_new_notification` — tentative de vérification backend (2026-10-19)

Projet Supabase `sistrs` (`grwwoigglxuqkgzvijky`) bien provisionné et
accessible via le connecteur MCP. Trigger confirmé présent en base
(`trg_push_new_notification`, AFTER INSERT sur `notifications`,
`information_schema.triggers`). Mais **0 ligne dans `profiles`** (donc
0 `push_token` renseigné) — impossible d'insérer une notification de test
vers un profil réel, et impossible d'en mettre un temporaire sur un profil
de test puisqu'aucun profil n'existe du tout (pas seulement sans
push_token). Créer un faux profil/utilisateur de toutes pièces pour ce
seul test fausserait les données de la base de démo — non fait,
conformément à la consigne. **Reste donc non vérifié en conditions
réelles** (ni insertion de notification ni confirmation via les logs
pg_net/query_logs) — à refaire dès qu'au moins un profil réel avec
`push_token` existera en base.

## Fait (session pipeline autonome — resserrement RLS)

- **`supabase/migrations/20261019000000_tighten_rls_policies.sql`** :
  resserre les 3 fuites de l'item "RLS à revisiter" (lecture `using (true)`
  trop large sur `profiles`, `event_registrations`,
  `channel_post_likes`/`poll_votes`). Nouveau modèle documenté dans
  `CLAUDE.md` § "RLS — modèle de confidentialité" : profils visibles pour
  soi-même/amies/organisatrices/personnes partageant un événement ; liste
  des inscrites à un événement limitée à l'organisatrice + les autres
  inscrites de ce même événement ; likes/votes limités à sa propre ligne.
  3 fonctions SQL `security definer` (`event_confirmed_count`,
  `channel_post_likes_count`, `poll_option_votes_count`) gardent les
  compteurs exacts pour tout le monde (places restantes, nb de likes, % de
  votes) sans exposer d'identité, en "computed columns" PostgREST.
- **Vérifié avant resserrement** (grep de toutes les requêtes Supabase
  concernées) : aucun écran ne liste tous les profils (seule la recherche
  d'amies fait un select large par nom — se resserre logiquement, effet
  recherché). Code ajusté dans `app/(tabs)/index.tsx`, `app/event/[id].tsx`,
  `app/channel/[id].tsx`, `components/events/EventCard.tsx` pour consommer
  les colonnes calculées au lieu de `.length` sur des listes désormais
  potentiellement partielles (liste détaillée des inscrites/avis : partielle
  pour qui n'a aucun lien avec l'événement — effet recherché ; compteurs :
  toujours exacts).
- **Validation** : pas de projet Supabase réel provisionné (`.env` vide) —
  migration jamais appliquée pour de vrai, vérifiée statiquement seulement.
  `tsc` sur les 4 fichiers app modifiés : aucune erreur propre au code
  modifié. **À surveiller en premier si problème après déploiement** : la
  syntaxe "computed column" PostgREST (`alias:nom_fonction`) n'a pas pu
  être testée contre un vrai PostgREST.

## Fait récemment — runs concurrents (détail complet dans l'archive)

- `channel-discover-subscribe.yaml` : découverte de canaux via le profil
  de l'organisatrice (section "Découvrir" supprimée le 2026-09-28) ;
  testID `button-toggle-follow-channel` ajouté.
- `signup-ocr-mismatch-warning.yaml`, `poll-revote.yaml`,
  `decline-friend-request.yaml` : écrits, jamais exécutés pour de vrai.
- `store/privacy-policy.md` et `store/app-store-listing.md` écrits
  (brouillons, à faire relire par un juriste). Aucun compte développeur
  payant créé.
- Trigger push `trg_push_new_notification` vérifié par inspection statique
  (base Supabase vide, pas de `push_token` réel pour tester en conditions
  réelles) — à refaire dès qu'un profil réel existera.
- `components/__tests__/EventLocationMap.test.tsx` : infra de test ajoutée
  from scratch (jest/jest-expo/RTL), jamais exécutée (`npm install` bloqué).

## Repères opérationnels essentiels (voir archive pour le détail)

- **Workflow** : commits directs sur `main`, jamais de branche/PR (décision
  utilisateur 2026-10-19). Jamais de `fire_trigger` auto-déclenché — le
  rythme est le cron horaire de la tâche planifiée uniquement.
- **`npm install` bloqué dans ce sandbox cloud** : résolution DNS de
  `registry.npmjs.org` échoue, confirmé à nouveau le 2026-10-19 — ne pas
  réessayer sans un nouveau signal que ça a changé. `tsc` seul (binaire
  global) reste utilisable pour une vérification syntaxique partielle :
  `tsc --ignoreConfig --noEmit --jsx react-native --esModuleInterop --skipLibCheck --allowJs --target es2020 --moduleResolution bundler <fichiers>`
  — ignorer les erreurs "Cannot find module"/implicit any (dues à l'absence
  de `node_modules`), ne regarder que les erreurs propres au code modifié.
- **Pont Mac (`device_bash`)** : tourne dans une VM Linux isolée, pas sur le
  vrai macOS — ne peut piloter ni Xcode Simulator ni Maestro CLI même avec
  un dossier connecté. Backlog Maestro (8 flows couvrant toute l'app) 100%
  écrit/câblé dans `scripts/run-maestro-suite.sh` mais jamais exécuté pour
  de vrai sur Simulator — reste la "Branche B" bloquée du pipeline. Les
  flows `cancel-registration.yaml`, `poll-revote.yaml`,
  `decline-friend-request.yaml` et `channel-discover-subscribe.yaml` (hors
  backlog, demandes séparées) sont dans la même situation : écrits/câblés,
  jamais exécutés pour de vrai.
- **Base Supabase du projet `sistrs` vide** (0 profil) depuis au moins le
  2026-10-19 : aucune donnée de démo/seed en base pour l'instant.

## En cours / à faire ensuite

1. **Tests fonctionnels manuels** (utilisateur, sur le Mac, development
   build) : flux complet, y compris "Mes événements passés" depuis Profil,
   et vérifier le nouveau comportement RLS (listes d'inscrites/avis
   partielles selon le lien avec l'événement).
2. **Écrans Figma manquants** : accueil/fil, détail événement, création
   événement, canal individuel, messagerie, profils (quota API Figma MCP
   atteint en cours de route, jamais repris).
3. **Backlog "prêt pour le store"** : contenu texte fait (`store/`, détail
   dans PROGRESS_ARCHIVE.md). Reste : relecture juridique de la politique de
   confidentialité, hébergement à une URL publique, captures d'écran et
   visuels, et — seulement sur confirmation explicite de l'utilisateur —
   création des comptes développeur Apple/Google (payants) et config EAS
   Submit.

## Décisions à ne pas reproposer (déjà tranchées)

- Pas de vérification d'identité tierce payante pour l'instant → ne pas
  reproposer Stripe Identity/Sumsub sans que l'utilisateur en parle
  lui-même.
- Pas de compte admin bypass permanent en production pour l'accès
  développeur → dev/staging uniquement.
- Nom du produit = Sistrs, pas Rosie.
