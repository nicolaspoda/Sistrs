# Sistrs — État d'avancement

> Ce fichier doit être mis à jour à la fin de chaque session de travail
> significative. Il est la source de vérité sur "où on en est" — à lire en
> entier avant de reprendre le travail, surtout après un changement de
> compte/session Claude Code. **Historique complet des sessions passées** :
> `PROGRESS_ARCHIVE.md` (déplacé là pour garder ce fichier court — le lire
> seulement si un détail précis d'une session passée est nécessaire).

Dernière mise à jour : 2026-10-19 (premier test automatisé de composant,
`EventLocationMap` ; sessions précédentes archivées dans
PROGRESS_ARCHIVE.md)

## Fait (session pipeline autonome — test composant EventLocationMap)

- **`components/__tests__/EventLocationMap.test.tsx` écrit** : demande
  séparée de l'utilisateur (`components/EventLocationMap.tsx` n'avait aucun
  test). Mock complet de `@rnmapbox/maps` (module natif absent de ce
  sandbox) — 3 cas : montage sans erreur avec token + coordonnées valides,
  coordonnées bien transmises à `Camera`/`PointAnnotation` mockés (en
  `[longitude, latitude]`), et pas de crash + message de repli quand
  `EXPO_PUBLIC_MAPBOX_TOKEN` est absent. Le token est lu au niveau module
  (pas dans le composant), donc chaque cas fait `jest.resetModules()` +
  `require()` après avoir positionné `process.env`.
- **Infra de test ajoutée from scratch** (aucune avant) : `jest`,
  `jest-expo`, `@testing-library/react-native`, `@types/jest`,
  `react-test-renderer` en devDependencies + script `npm test` + config
  `"jest": { "preset": "jest-expo" }` dans `package.json`. Versions choisies
  au jugé (compatibles Expo SDK 57 / React 19.2 / RN 0.86) — **pas
  vérifiées par un vrai `npm install`** (voir limite ci-dessous) : à
  ajuster par l'utilisateur si `npm install` signale un conflit.
- **LIMITE IMPORTANTE (double)** : (1) `npm install` toujours bloqué dans ce
  sandbox (DNS `registry.npmjs.org` inatteignable, reconfirmé ce jour,
  même en forçant le proxy) → le test n'a **jamais été exécuté pour de
  vrai** ici, seulement validé statiquement (`tsc` partiel, erreurs
  "Cannot find process/jest/require" ignorées car dues à l'absence de
  `@types/node`/`@types/jest` non installés — aucune autre erreur). À
  exécuter (`npm install` puis `npm test`) sur le Mac de l'utilisateur
  avant de faire confiance au résultat. (2) Même une fois exécuté pour de
  vrai, ce test ne remplace PAS une vérification visuelle de la carte
  Mapbox (zoom, marqueur bien positionné, tuiles qui chargent) — ça reste
  à faire manuellement par l'utilisateur sur son Mac/device avec un
  development build.

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
  flows `cancel-registration.yaml`, `poll-revote.yaml` et
  `decline-friend-request.yaml` (hors backlog, demandes séparées) sont
  dans la même situation : écrits/câblés, jamais exécutés pour de vrai.
- **Base Supabase du projet `sistrs` vide** (0 profil) depuis au moins le
  2026-10-19 : aucune donnée de démo/seed en base pour l'instant.

## En cours / à faire ensuite

1. **Tests fonctionnels manuels** (utilisateur, sur le Mac, development
   build) : flux complet, y compris "Mes événements passés" depuis Profil.
2. **Écrans Figma manquants** : accueil/fil, détail événement, création
   événement, canal individuel, messagerie, profils (quota API Figma MCP
   atteint en cours de route, jamais repris).
3. **RLS à revisiter** : policies actuelles privilégient la simplicité
   (lecture large aux authentifiées) plutôt qu'une confidentialité stricte.
4. **Backlog "prêt pour le store"** : contenu texte fait (voir ci-dessus,
   `store/`). Reste : relecture juridique de la politique de
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
