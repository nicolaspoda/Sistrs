# Sistrs — État d'avancement

> Ce fichier doit être mis à jour à la fin de chaque session de travail
> significative. Il est la source de vérité sur "où on en est" — à lire en
> entier avant de reprendre le travail, surtout après un changement de
> compte/session Claude Code. **Historique complet des sessions passées** :
> `PROGRESS_ARCHIVE.md` (déplacé là pour garder ce fichier court — le lire
> seulement si un détail précis d'une session passée est nécessaire).

Dernière mise à jour : 2026-10-19 (sessions : ajout de l'écran "Mes
événements passés" ; flow Maestro cancel-registration écrit — hors backlog,
demande séparée)

## Fait (session pipeline autonome — flow cancel-registration)

- **`.maestro/cancel-registration.yaml` écrit** : flow qui n'était PAS dans le
  backlog "Flows Maestro manquants" (déjà entièrement fait, items 1-8), mais
  une demande séparée de l'utilisateur. Il crée ses propres comptes (une
  organisatrice et une participante, générés à la volée) et un événement
  limité à 2 places. La participante s'inscrit, puis annule via
  `button-cancel-registration`. Le flow vérifie que le compteur revient à "2
  places restantes sur 2" et que `button-register-event` réapparaît après
  l'annulation. Ajouté à `scripts/run-maestro-suite.sh` dans un bloc `run_flow
  "cancel-registration.yaml"` avec ses propres variables
  `CANCEL_ORGANIZER_EMAIL`/`CANCEL_PARTICIPANT_EMAIL`/`CANCEL_EVENT_TITLE`,
  indépendant des autres flows.
- **Validation effectuée** : pas d'exécution réelle (pas de Mac/Simulator
  connecté à cette session) — validation statique uniquement (`bash -n` sur
  `run-maestro-suite.sh`, parsing YAML du nouveau flow avec PyYAML), les deux
  OK.

## Fait (ce run — écran "Mes événements passés")

- **Manque produit comblé** (identifié le 2026-10-19 en écrivant
  `.maestro/event-review.yaml`, voir archive) : avant cet écran, le seul
  moyen d'atteindre le détail d'un événement déjà terminé pour y laisser un
  avis était de taper sur une notification qui le référence — impossible si
  cette notification n'existe plus. Nouvel écran `app/past-events.tsx`
  (route `/past-events`), accessible via un nouveau bouton "Mes événements
  passés" sur l'onglet Profil (`button-past-events` dans
  `app/(tabs)/profile.tsx`). Liste les événements où l'inscription de la
  participante est **confirmée** et dont `start_at < now()`, triés du plus
  récent au plus ancien, avec accès au détail de chacun (où se trouve déjà
  le formulaire d'avis).
- **Requête Supabase** : `events` jointe à `event_registrations!inner`
  (transforme la relation en filtre) avec `.eq("registration.participant_id",
  profile.id)` + `.eq("registration.status", "confirmed")` +
  `.lt("start_at", nowIso)` — jamais un événement à venir, jamais une
  inscription en attente/annulée. Les notes de la participante déjà
  envoyées (`event_reviews`) sont chargées à part (par liste d'event_id) et
  affichées en aperçu sur chaque ligne ("Avis envoyé" / "Laisser un avis").
- **Tests faits** : `tsc` isolé par fichier (pas de `node_modules` dans ce
  sandbox — voir "Repères opérationnels" plus bas — mais syntaxe/typage
  propre au nouveau code vérifiés : aucune erreur hors la catégorie connue
  "Cannot find module"/implicit any déjà présente ailleurs dans le repo pour
  la même raison). Script Python statique (`check_past_events_query.py`,
  scratchpad, non committé) vérifiant par regex que les 5 clauses de filtre
  ci-dessus sont bien présentes dans le fichier — relancé après écriture,
  passe.
- **Pas touché à autre chose** dans le backlog (objectif unique de ce run).

## Repères opérationnels essentiels (voir archive pour le détail)

- **Workflow** : commits directs sur `main`, jamais de branche/PR (décision
  utilisateur 2026-10-19). Jamais de `fire_trigger` auto-déclenché — le
  rythme est le cron horaire de la tâche planifiée uniquement.
- **`npm install` bloqué dans ce sandbox cloud** : résolution DNS de
  `registry.npmjs.org` échoue (`curl`: "Could not resolve host"), confirmé
  à nouveau le 2026-10-19 — ne pas réessayer sans un nouveau signal que ça a
  changé. `tsc` seul (binaire global `tsc`, pas celui du projet) reste
  utilisable pour une vérification syntaxique partielle :
  `tsc --ignoreConfig --noEmit --jsx react-native --esModuleInterop --skipLibCheck --allowJs --target es2020 --moduleResolution bundler <fichiers>`
  — ignorer les erreurs "Cannot find module"/implicit any (dues à l'absence
  de `node_modules`), ne regarder que les erreurs propres au code modifié.
- **Pont Mac (`device_bash`)** : tourne dans une VM Linux isolée, pas sur le
  vrai macOS — ne peut piloter ni Xcode Simulator ni Maestro CLI même avec
  un dossier connecté. Backlog Maestro (8 flows couvrant toute l'app) 100%
  écrit/câblé dans `scripts/run-maestro-suite.sh` mais jamais exécuté pour
  de vrai sur Simulator — reste la "Branche B" bloquée du pipeline. Le flow
  `cancel-registration.yaml` (hors backlog, voir section ci-dessus) est dans
  la même situation : écrit/câblé, jamais exécuté pour de vrai.

## En cours / à faire ensuite

1. **Tests fonctionnels manuels** (utilisateur, sur le Mac, development
   build) : flux complet incluant maintenant l'accès "Mes événements
   passés" depuis Profil.
2. **Écrans Figma manquants** : accueil/fil, détail événement, création
   événement, canal individuel, messagerie, profils (quota API Figma MCP
   atteint en cours de route, jamais repris).
3. **RLS à revisiter** : policies actuelles privilégient la simplicité
   (lecture large aux authentifiées) plutôt qu'une confidentialité stricte.
4. **Backlog "prêt pour le store"** (politique de confidentialité, fiches
   stores, comptes développeur payants) : à ne traiter qu'une fois la
   couverture E2E (Branche B) avancée, et jamais créer de compte développeur
   payant sans confirmation explicite de l'utilisateur.

## Décisions à ne pas reproposer (déjà tranchées)

- Pas de vérification d'identité tierce payante pour l'instant → ne pas
  reproposer Stripe Identity/Sumsub sans que l'utilisateur en parle
  lui-même.
- Pas de compte admin bypass permanent en production pour l'accès
  développeur → dev/staging uniquement.
- Nom du produit = Sistrs, pas Rosie.
