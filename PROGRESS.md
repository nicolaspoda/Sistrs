# Sistrs — État d'avancement

> Ce fichier doit être mis à jour à la fin de chaque session de travail
> significative. Il est la source de vérité sur "où on en est" — à lire en
> entier avant de reprendre le travail, surtout après un changement de
> compte/session Claude Code. **Historique complet des sessions passées** :
> `PROGRESS_ARCHIVE.md` (déplacé là pour garder ce fichier court — le lire
> seulement si un détail précis d'une session passée est nécessaire).

Dernière mise à jour : 2026-10-19 (flow Maestro channel-discover-subscribe
écrit — résout le blocage signalé par un run concurrent, voir note
ci-dessous —, flow signup-ocr-mismatch-warning écrit, et test de
composant EventLocationMap écrit ; trois runs concurrents distincts,
demandes séparées ; sessions précédentes archivées dans
PROGRESS_ARCHIVE.md)

## Fait récemment (détail complet dans l'archive)

- **`components/__tests__/EventLocationMap.test.tsx` écrit** (ce run
  concurrent, demande séparée) : 3 cas avec `@rnmapbox/maps` mocké
  (montage OK, coordonnées bien transmises, repli propre si token Mapbox
  absent). **Infra de test ajoutée from scratch** (jest/jest-expo/RTL,
  `npm test`) — versions choisies au jugé, **jamais exécutées pour de
  vrai** (`npm install` toujours bloqué dans ce sandbox, DNS
  `registry.npmjs.org` inatteignable). Ne remplace pas la vérification
  visuelle manuelle de la carte. Détail complet dans PROGRESS_ARCHIVE.md.
- **`channel-discover-subscribe.yaml`** (ce run) : la tâche visait la
  section "Découvrir" de `app/(tabs)/channels.tsx`, supprimée
  délibérément le 2026-09-28 (commit `231879e`) — la découverte de canaux
  se fait désormais via les publications/profils des organisatrices. Flow
  adapté au vrai parcours actuel : Amies > profil de l'organisatrice >
  "Voir son canal" > abonnement explicite (`button-toggle-follow-channel`,
  testID manquant ajouté sur `app/channel/[id].tsx`) > vérification dans
  l'onglet "Canaux". Réutilise le setup de `channel-post-and-poll.yaml`
  via `runFlow`. Détail complet dans PROGRESS_ARCHIVE.md.
- Flows Maestro `poll-revote.yaml` (changement de vote sur sondage) et
  `decline-friend-request.yaml` (refus de demande d'amitié) écrits, jamais
  exécutés pour de vrai (pas de Mac/Simulator connecté).
- `store/privacy-policy.md` et `store/app-store-listing.md` écrits
  (brouillons, à faire relire par un juriste). Aucun compte développeur
  payant créé.
- **Vérification trigger push `trg_push_new_notification`** (demandée
  séparément) : base Supabase du projet `sistrs` entièrement vide (0 profil,
  0 notification) → aucun `push_token` disponible pour tester par insertion
  réelle, et inventer un faux profil/token était explicitement exclu par la
  consigne. Vérifié par inspection statique seulement : trigger présent et
  activé, extension `pg_net` installée, `net._http_response` à 0 ligne
  (cohérent avec l'absence de données, pas un signe de panne). **À refaire**
  dès qu'un profil réel (ou démo légitime) avec `push_token` existera.
- **Validation `channel-discover-subscribe.yaml`** : pas d'exécution réelle
  (pas de Mac/Simulator connecté à cette session) — validation statique
  uniquement (`bash -n` sur `run-maestro-suite.sh`, parsing YAML avec
  PyYAML, `tsc` partiel sur `app/channel/[id].tsx`), tout OK.

## Note : blocage channel-discover-subscribe résolu (run concurrent)

Un run concurrent de cette même session avait diagnostiqué le même
problème (section "Découvrir" absente du code, voir diagnostic détaillé
dans PROGRESS_ARCHIVE.md) et s'était arrêté sans écrire de flow, listant
trois options pour l'utilisateur. Ce run-ci a choisi l'option (b) de ce
diagnostic — réécrire le flow pour coller au chemin UI réel de découverte
(profil organisatrice, comme `channel-post-and-poll.yaml`) plutôt que
d'attendre une décision produit — et l'a écrit avec succès (voir
`.maestro/channel-discover-subscribe.yaml` et l'entrée "Fait récemment"
ci-dessus). Si l'utilisateur préfère l'option (a) (une vraie section
"Découvrir" dans l'onglet Canaux), ce flow restera valide comme test du
chemin découverte-via-profil, et un flow supplémentaire pourrait couvrir
la nouvelle section le cas échéant.

## Fait (session pipeline autonome — flow signup-ocr-mismatch-warning)

- **`.maestro/signup-ocr-mismatch-warning.yaml` écrit** (détail complet
  dans PROGRESS_ARCHIVE.md) : avertissement OCR non bloquant à
  l'inscription en cas de nom/prénom ne correspondant pas à la pièce
  d'identité uploadée — nom volontairement différent de celui de la
  fausse carte de test pour forcer le mismatch de façon déterministe,
  avertissement vérifié, bypass au second appui vérifié. Ajouté à
  `scripts/run-maestro-suite.sh`. Jamais exécuté pour de vrai (pas de
  Mac/Simulator connecté).

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
   build) : flux complet, y compris "Mes événements passés" depuis Profil.
2. **Écrans Figma manquants** : accueil/fil, détail événement, création
   événement, canal individuel, messagerie, profils (quota API Figma MCP
   atteint en cours de route, jamais repris).
3. **RLS à revisiter** : policies actuelles privilégient la simplicité
   (lecture large aux authentifiées) plutôt qu'une confidentialité stricte.
4. **Backlog "prêt pour le store"** : contenu texte fait (`store/`, détail
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
