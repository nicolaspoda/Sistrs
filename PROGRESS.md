# Sistrs — État d'avancement

> Ce fichier doit être mis à jour à la fin de chaque session de travail
> significative. Il est la source de vérité sur "où on en est" — à lire en
> entier avant de reprendre le travail, surtout après un changement de
> compte/session Claude Code.

Dernière mise à jour : 2026-10-19

## Fait

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
  **Correction (2026-10-19) : le champ `gender` était en fait déjà présent
  dans `supabase/schema.sql` (`profiles.gender text not null`) — la note
  disant qu'il manquait était obsolète.**
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
- **Projet Supabase créé et schéma appliqué (2026-10-19)** : projet `sistrs`
  (ref `grwwoigglxuqkgzvijky`, région `eu-west-1`, org "nicolaspoda's Org").
  `supabase/schema.sql` appliqué intégralement en migration (`initial_schema`,
  avec cast explicite `::user_status` sur la colonne générée `profiles.status`
  pour satisfaire Postgres). RLS pas encore activé (volontaire à ce stade,
  voir advisories).
- **Tâche planifiée de développement continu créée** : s'exécute environ
  toutes les 6h, lit ce fichier et `CLAUDE.md`, prend une tâche de la liste
  ci-dessous, code, teste, ouvre une PR, met à jour ce fichier.

## En cours / à faire ensuite

1. Scaffolding du projet Expo dans le repo `sistrs` (structure de dossiers,
   config, dépendances de base).
2. Configurer Auth (providers, templates email) et Storage (buckets pour
   avatars, bannières, pièces d'identité, images d'événements) sur le
   projet Supabase.
3. Écrire les policies RLS Supabase une fois les écrans/flows principaux
   clairs (le schéma actuel n'en contient volontairement pas pour rester
   lisible au départ — voir advisories de sécurité Supabase, 20 tables
   publiques sans RLS, attendu à ce stade).
4. Terminer les écrans manquants de la maquette Figma (liste ci-dessus) —
   soit en reprenant Figma si le quota est repassé, soit via un prototype
   cliquable alternatif (option évoquée mais pas retenue formellement).
5. Décider du SDK de carte (Mapbox vs Google Maps) — pas encore tranché.

## Décisions en attente de l'utilisateur

- SDK de carte : Mapbox vs react-native-maps/Google Maps — pas tranché.

## Décisions à ne pas reproposer (déjà tranchées)

- Pas de vérification d'identité tierce payante pour l'instant → ne pas
  reproposer Stripe Identity/Sumsub sans que l'utilisateur en parle
  lui-même.
- Pas de compte admin bypass permanent en production pour l'accès
  développeur → dev/staging uniquement.
- Nom du produit = Sistrs, pas Rosie.
