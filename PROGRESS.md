# Sistrs — État d'avancement

> Ce fichier doit être mis à jour à la fin de chaque session de travail
> significative. Il est la source de vérité sur "où on en est" — à lire en
> entier avant de reprendre le travail, surtout après un changement de
> compte/session Claude Code. **Historique complet des sessions passées** :
> `PROGRESS_ARCHIVE.md` (déplacé là pour garder ce fichier court — le lire
> seulement si un détail précis d'une session passée est nécessaire).

Dernière mise à jour : 2026-10-19 (flow Maestro decline-friend-request
écrit, et contenu texte "prêt pour le store" écrit — deux sessions
distinctes, demandes séparées ; sessions précédentes archivées dans
PROGRESS_ARCHIVE.md)

## Fait (session pipeline autonome — flow decline-friend-request)

- **`.maestro/decline-friend-request.yaml` écrit** : demande séparée de
  l'utilisateur (pas dans le backlog "Flows Maestro manquants", déjà
  entièrement fait, items 1-8). `friend-request-flow.yaml` ne couvrait
  que l'ACCEPTATION d'une demande d'amitié ; ce nouveau flow couvre le
  REFUS, jusque-là non testé. Deux comptes ("Chloé Fontaine"/FRIEND_*,
  "Inès Marchand"/REQUESTER_*) — noms de famille différents de
  friend-request-flow.yaml ("Rousseau"/"Girard") pour que la recherche
  par nom ne remonte jamais un profil de l'autre flow sur un run
  partagé. Inès envoie la demande à Chloé, qui la refuse via
  `button-decline-friend-request` (testID déjà existant). Vérifie que la
  demande disparaît de l'onglet "Demandes" (état vide "Aucune demande en
  attente") ET que les deux comptes n'apparaissent PAS comme amies
  ensuite, des deux côtés : onglet "Mes amies" vide pour Chloé, puis
  reconnexion avec Inès pour vérifier que son onglet "Mes amies" est vide
  aussi. `handleDecline` dans `app/(tabs)/friends.tsx` fait un DELETE
  direct de la ligne `friendships` (pas un changement de statut), d'où
  cette vérification symétrique des deux côtés. Ajouté à
  `scripts/run-maestro-suite.sh` (`run_flow "decline-friend-request.yaml"`
  avec ses propres variables `DECLINE_FRIEND_EMAIL`/
  `DECLINE_REQUESTER_EMAIL`, indépendantes de celles de
  `friend-request-flow.yaml`).
- **Validation effectuée** : pas d'exécution réelle (pas de Mac/Simulator
  connecté à cette session) — validation statique uniquement (`bash -n`
  sur `run-maestro-suite.sh`, parsing YAML du nouveau flow avec PyYAML),
  les deux OK.

## Fait (session pipeline autonome — contenu texte store)

- **`store/privacy-policy.md` et `store/app-store-listing.md` écrits**
  (brouillons texte uniquement, à faire relire par un juriste avant mise
  en ligne réelle) : politique de confidentialité en français couvrant la
  collecte du genre déclaré, de la pièce d'identité (stockage privé,
  OCR on-device non bloquant, pas de prestataire KYC), de la
  géolocalisation, de la messagerie, et des sous-traitants (Supabase,
  Expo, Mapbox) ; fiche store avec description courte/longue, catégorie
  suggérée, mots-clés, et une proposition de classification d'âge (17+
  App Store / Mature 17+ Play Store, à confirmer via les questionnaires
  officiels) justifiée par le contenu généré par les utilisatrices et les
  références à l'alcool (sorties bar).
- **Aucun compte développeur payant créé, aucune config EAS Submit** —
  conformément à la règle non négociable de la tâche. Noté explicitement
  dans `store/app-store-listing.md` comme décision en attente de
  l'utilisateur.

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
