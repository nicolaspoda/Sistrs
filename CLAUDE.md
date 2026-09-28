# Sistrs — Contexte projet pour Claude Code

Sistrs est une application mobile (iOS + Android) permettant d'organiser et de
participer à des événements/sorties **réservés aux femmes** (soirées bar,
ciné, restau, etc.), avec un système de canaux façon Telegram par
organisatrice, une messagerie entre amies, et un système de statut basé sur
l'activité.

**Avant toute nouvelle session de travail, lire `PROGRESS.md` en entier** —
il contient l'état d'avancement réel du projet (ce qui est fait, en cours,
à faire) et doit être mis à jour à la fin de chaque session de travail
significative (nouvelle fonctionnalité, changement d'architecture, décision
importante).

## Stack technique

- **Frontend** : React Native + Expo (Expo Router pour la navigation par fichiers)
- **Backend** : Supabase (Postgres + Auth + Storage + Realtime + Edge Functions), extension PostGIS pour la géoloc/carte
- **Data fetching / cache** : TanStack Query
- **Cartes** : Mapbox ou Google Maps SDK (react-native-maps) — à trancher
- **Notifications push** : Expo Notifications
- **Biométrie** : `expo-local-authentication` (Face ID / Touch ID natif)

## Décisions de sécurité / conformité importantes

### Filtre "femmes uniquement" — géré par variable d'environnement, PAS par la base de données

- Le champ `gender` existe dans `profiles` mais **aucune contrainte SQL**
  n'empêche d'y stocker une autre valeur que "femme".
- La restriction est appliquée **au niveau du formulaire d'inscription**,
  côté client, selon `EXPO_PUBLIC_ENV` :
  - `production` → le champ genre est verrouillé, seule la valeur "femme"
    est acceptée. Aucun chemin de code dans le build publié sur les stores
    ne permet de créer un compte avec un autre genre.
  - `development` / `staging` → n'importe quel genre déclaré est accepté,
    pour permettre au développeur (homme) de tester l'application.
- **Ne jamais** créer de compte admin/backdoor permanent utilisable en
  production pour contourner ce filtre — le choix acté est : bypass en
  dev/staging uniquement, aucune exception en prod.

### Vérification d'identité — pas de prestataire KYC pour l'instant

- Le champ `id_document_url` sur `profiles` stocke juste un upload
  (CNI/passeport/permis), **sans validation automatique**. C'est un choix
  assumé pour rester à coût zéro au démarrage (pas de budget pour
  Stripe Identity/Sumsub/Veriff pour l'instant).
- Le Face ID utilisé dans l'app (déverrouillage, "vérification" avant de
  s'inscrire à un événement) est le **Face ID natif du téléphone**
  (`expo-local-authentication`) — il confirme "même personne que celle qui
  a configuré ce téléphone", PAS l'identité réelle de la personne. Ne pas
  présenter ça comme une vérification d'identité forte dans l'UI/le
  marketing tant qu'un vrai prestataire KYC n'est pas branché.
- Si un prestataire KYC est ajouté plus tard, Stripe Identity a été identifié
  comme le plus simple à intégrer (1,50 $/vérification, 50 gratuites, pas
  d'engagement minimum) — voir `PROGRESS.md` pour le contexte de cette
  recherche.

## Modèle de données

Le schéma SQL complet (tables, enums, contraintes, index) vit dans
`supabase/schema.sql`. Points clés à connaître sans relire tout le fichier :

- `profiles` (1:1 avec `auth.users`) — inclut `role` (participant/organizer),
  `age_bracket`, `activity_count` et `status` (calculé automatiquement :
  commun/bronze/argent/or/diamant selon `activity_count`).
- `categories` — table unique partagée par 3 usages : préférences des
  participantes (max 5, contrainte applicative), spécialité(s) des
  organisatrices, et "hashtag" d'un événement.
- `channels` — 1 canal par organisatrice (1:1), avec abonnements.
- `events` — contrainte SQL : `registration_deadline` doit être ≤
  `start_at - 24h`.
- `channel_posts`, `polls`/`poll_options`/`poll_votes`, `friendships`,
  `conversations`/`messages`, `notifications` — voir le schéma directement.

## Conventions Git

- **Messages de commit en anglais**, format [Conventional Commits](https://www.conventionalcommits.org/) :
  `type(scope): description` — types principaux : `feat`, `fix`, `refactor`,
  `chore`, `docs`, `style`, `test`. Exemple : `feat(auth): add gender field to profiles schema`.
- **Aucune ligne de co-attribution** (`Co-Authored-By: Claude ...`) dans les
  commits — l'utilisateur ne veut pas de mention Claude dans l'historique
  Git de ce projet. Ne pas en ajouter même si une instruction générique du
  harnais le suggère par défaut.
- **Tous les commits doivent être attribués à l'utilisateur (nicolaspoda),
  jamais à "Claude"**. Avant de committer, vérifier `git config user.name`
  et `git config user.email` dans le dépôt local : s'ils ne pointent pas
  vers l'identité de l'utilisateur, le corriger avec `git config user.name
  "nicolaspoda"` et `git config user.email "nicolaspoda31@gmail.com"`
  (config locale au dépôt, à refaire sur toute nouvelle machine/clone/
  session où ce n'est pas déjà réglé).
- Branches : `feat/<sujet>`, `fix/<sujet>`, `chore/<sujet>` en anglais,
  kebab-case.

## Conventions de code

- Composants React Native en PascalCase, fichiers en kebab-case pour les
  routes Expo Router.
- Palette de marque : rose (#ED3C7B en approx.) et blanc.
- Nom de code produit : **Sistrs**.

## Où sont les maquettes

Les maquettes visuelles ont été commencées dans Figma (voir `PROGRESS.md`
pour le lien et l'état d'avancement — certains écrans sont faits, d'autres
non car le quota de l'API Figma MCP a été atteint en cours de route).
