# Sistrs — État d'avancement

> Ce fichier doit être mis à jour à la fin de chaque session de travail
> significative. Il est la source de vérité sur "où on en est" — à lire en
> entier avant de reprendre le travail, surtout après un changement de
> compte/session Claude Code.

Dernière mise à jour : 2026-09-28

## Fait

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

## Fait (précédent)

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

1. Terminer les écrans manquants de la maquette Figma (liste ci-dessus) —
   soit en reprenant Figma si le quota est repassé, soit via un prototype
   cliquable alternatif (option évoquée mais pas retenue formellement).
2. Décider du SDK de carte (Mapbox vs Google Maps) — pas encore tranché.
3. Écrire les policies RLS Supabase une fois les écrans/flows principaux
   clairs (RLS pas encore activé — le schéma n'en contient volontairement
   pas pour l'instant, pour rester lisible).
4. Brancher l'auth Supabase (écrans d'inscription/connexion Figma déjà
   faits) sur le client `lib/supabase.ts` maintenant en place.
5. Construire le vrai contenu des 5 écrans d'onglets (actuellement de
   simples placeholders).

## Décisions à ne pas reproposer (déjà tranchées)

- Pas de vérification d'identité tierce payante pour l'instant → ne pas
  reproposer Stripe Identity/Sumsub sans que l'utilisateur en parle
  lui-même.
- Pas de compte admin bypass permanent en production pour l'accès
  développeur → dev/staging uniquement.
- Nom du produit = Sistrs, pas Rosie.
