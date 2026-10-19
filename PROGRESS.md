# Sistrs — État d'avancement

> Ce fichier doit être mis à jour à la fin de chaque session de travail
> significative. Il est la source de vérité sur "où on en est" — à lire en
> entier avant de reprendre le travail, surtout après un changement de
> compte/session Claude Code. **Historique complet des sessions passées** :
> `PROGRESS_ARCHIVE.md` (déplacé là pour garder ce fichier court — le lire
> seulement si un détail précis d'une session passée est nécessaire).

Dernière mise à jour : 2026-10-19 (flow Maestro poll-revote écrit — hors
backlog, demande séparée ; sessions précédentes archivées dans
PROGRESS_ARCHIVE.md)

## Fait (session pipeline autonome — flow poll-revote)

- **`.maestro/poll-revote.yaml` écrit** : demande séparée de l'utilisateur
  (pas dans le backlog "Flows Maestro manquants", déjà entièrement fait,
  items 1-8). `channel-post-and-poll.yaml` (item 5) ne testait que le
  PREMIER vote sur un sondage ; ce nouveau flow vérifie le CHANGEMENT de
  vote : la participante vote pour "Un karaoke", puis change pour "Un bar
  a cocktails", et on vérifie que l'ancienne option repasse à 0 % pendant
  que la nouvelle passe à 100 % (total toujours à 1 vote, jamais 2).
  Réutilise tel quel le setup de `channel-post-and-poll.yaml` via
  `runFlow` plutôt que de le dupliquer. Pas de testID dédié sur les
  options de sondage affichées (seuls les champs de création en ont) :
  vérification par le pourcentage affiché à côté du libellé de chaque
  option, via le sélecteur relatif Maestro `rightOf` (jamais utilisé
  jusqu'ici dans ce repo, mais documenté côté Maestro). Ajouté à
  `scripts/run-maestro-suite.sh` (`run_flow "poll-revote.yaml"` avec ses
  propres variables `REVOTE_ORGANIZER_EMAIL`/`REVOTE_PARTICIPANT_EMAIL`,
  indépendantes de celles de `channel-post-and-poll.yaml`).
- **Validation effectuée** : pas d'exécution réelle (pas de Mac/Simulator
  connecté à cette session) — validation statique uniquement (`bash -n`
  sur `run-maestro-suite.sh`, parsing YAML du nouveau flow avec PyYAML),
  les deux OK. Le sélecteur `rightOf` n'a donc pas pu être vérifié sur un
  vrai Simulator — à surveiller en premier si ce flow échoue à sa
  première exécution réelle.

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
  flows `cancel-registration.yaml` et `poll-revote.yaml` (hors backlog,
  demandes séparées) sont dans la même situation : écrits/câblés, jamais
  exécutés pour de vrai.

## En cours / à faire ensuite

1. **Tests fonctionnels manuels** (utilisateur, sur le Mac, development
   build) : flux complet, y compris "Mes événements passés" depuis Profil.
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
