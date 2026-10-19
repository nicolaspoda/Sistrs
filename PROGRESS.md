# Sistrs — État d'avancement

> Ce fichier doit être mis à jour à la fin de chaque session de travail
> significative. Il est la source de vérité sur "où on en est" — à lire en
> entier avant de reprendre le travail, surtout après un changement de
> compte/session Claude Code.

Dernière mise à jour : 2026-10-19 (session : flow Maestro
profile-edit-avatar.yaml ajouté — item 8, dernier du backlog "Flows Maestro
manquants" — backlog dev Maestro désormais entièrement écrit, Branche B
(exécution réelle sur Simulator) reste la seule étape non faite)

## Fait (session pipeline autonome — flow profile-edit-avatar)

- **`.maestro/profile-edit-avatar.yaml` écrit** (item 8, dernier du backlog
  "Flows Maestro manquants" ci-dessous) : un compte participante ("Lea
  Petit") modifie sa bio puis change son avatar, avec vérification de
  persistance après déconnexion/reconnexion. Comme pour la pièce d'identité
  à l'inscription, le vrai sélecteur de photos natif (PHPicker) n'est pas
  piloté par Maestro — un nouveau raccourci développeur
  (`link-dev-use-test-avatar`, visible uniquement hors production, même
  principe que `link-dev-use-test-id` dans `app/(auth)/sign-up.tsx`) charge
  un avatar de test depuis les assets de l'app, mais déclenche malgré tout
  un upload réel vers le bucket Supabase Storage `avatars` et une vraie
  mise à jour de `profiles.avatar_url` (seul le choix du fichier source est
  simulé, pas l'upload). Vérification de l'avatar nécessairement indirecte :
  `components/Avatar.tsx` affiche les initiales du nom ("LP") en fallback
  tant qu'`avatar_url` est vide, une vraie image sinon — le flow vérifie
  donc que "LP" disparaît après le raccourci, plutôt que le contenu de
  l'image.
  TestID ajoutés dans `app/(tabs)/profile.tsx` : `input-profile-first-name`,
  `input-profile-last-name`, `input-profile-bio` (champs d'édition du
  profil, qui n'en avaient aucun jusqu'ici), `button-edit-profile` (icône
  crayon qui ouvre l'édition bio/nom — disambiguée de `button-edit-categories`,
  ajouté sur l'icône crayon équivalente de la section Spécialités/Préférences
  pour éviter toute ambiguïté future), `button-save-profile`,
  `button-cancel-edit-profile`, `link-dev-use-test-avatar`.
  Changement de code non-mécanique (fait moi-même, pas délégué) : extraction
  de la logique d'upload+mise à jour `avatar_url` partagée entre
  `handlePickAvatar` (sélecteur réel) et le nouveau `handleUseDevTestAvatar`
  (raccourci dev) dans une fonction commune `applyAvatarUri` — évite la
  duplication et garantit que le raccourci dev suit exactement le même
  chemin d'upload réel que l'utilisatrice normale. Réutilise l'asset
  `assets/dev/fake-id-card.png` déjà présent (son contenu visuel n'a aucune
  importance pour ce test) plutôt que d'ajouter un nouveau fichier binaire.
  Ajouté à `scripts/run-maestro-suite.sh` (toujours exécuté, compte généré à
  la volée comme les autres flows non gated par `TEST_PASSWORD`).
  Validation faite : le YAML parse comme deux documents valides (`pyyaml`,
  48 étapes), `bash -n` passe sur le script modifié, relecture manuelle
  complète du diff `.tsx` (vérification des accolades/parenthèses
  équilibrées en plus de la lecture ligne à ligne, `tsc` isolé sans
  `node_modules` non concluant comme documenté plus bas — pas de nouvelle
  tentative `npm install`, limitation déjà confirmée à plusieurs reprises).
  Écriture mécanique du YAML et du diff `scripts/run-maestro-suite.sh`
  déléguée à un sous-agent Haiku une fois la logique et le contenu exact
  entièrement décidés par moi (Sonnet) ; les testID et le changement de
  logique dans `profile.tsx` ont été faits directement par moi (pas
  délégués) car ils touchent une fonction partagée et du JSX imbriqué, pas
  une simple répétition mécanique.
- **Branche B (test E2E réel) non tentée ce run** : `get_device_info`
  répond, mais `connectedFolders` est de nouveau vide (comme pour la
  majorité des runs précédents, à l'exception du run event-review).
  Conforme à la procédure : pas de tentative de contournement par contrôle
  d'écran macOS pour une branche B qui n'a même pas de dossier connecté (ce
  contournement ne s'applique qu'à un `device_bash` incapable malgré un
  dossier connecté, pas à son absence). Branche A suivie à la place —
  d'autant plus naturel ici que le backlog Maestro avait encore un item non
  bloqué (item 8).
- **Git config locale** : `user.name`/`user.email` du clone pointaient
  encore vers "Claude"/"noreply@anthropic.com" au début de ce run (reset
  entre deux clones/sessions) — corrigés en tout premier lieu vers
  "nicolaspoda"/"nicolaspoda31@gmail.com" avant tout commit, conformément à
  CLAUDE.md.

## Fait (session pipeline autonome — flow notifications)

- **`.maestro/notifications.yaml` écrit** (item 7 du backlog "Flows Maestro
  manquants" ci-dessous) : vérifie qu'une notification in-app apparaît bien
  après l'action d'une autre utilisatrice, et qu'elle peut être marquée comme
  lue. Réutilise le déclencheur de `friend-request-flow.yaml` (demande
  d'amitié entre deux comptes créés à la volée, "Chloé Marchand"
  destinataire / "Juliette Caron" expéditrice) plutôt que d'en inventer un
  nouveau — chemin le plus simple pour générer une notification
  `friend_request` fiable sans dépendre d'un seed. Après connexion avec le
  compte destinataire, le flow ouvre l'écran Notifications via la cloche de
  l'onglet Accueil (`button-notifications`), vérifie que le bandeau "Tout
  marquer comme lu" et le libellé "Juliette Caron vous a envoyé une demande
  d'amie" sont visibles, tape sur le nouveau bouton dédié
  `button-notification-mark-read` (marque comme lue sans naviguer vers le
  profil de l'expéditrice, contrairement à un tap sur la ligne entière), puis
  vérifie que le bandeau "Tout marquer comme lu" disparaît (confirme que le
  marquage est bien persisté) tandis que le libellé de la notification reste
  visible. Retour à l'écran Accueil via le nouveau bouton `button-back`.
  Ajouté à `scripts/run-maestro-suite.sh` (toujours exécuté, comptes générés
  à la volée comme les autres flows non gated par `TEST_PASSWORD`).
  TestID ajoutés : `app/notifications.tsx` (`button-notification-mark-read`
  sur le bouton de marquage individuel), `components/BackButton.tsx`
  (`button-back`, composant partagé par plusieurs écrans — aucun flow
  existant ne s'appuyait encore dessus).
  Validation faite : le YAML parse comme deux documents valides (`pyyaml`,
  95 étapes), `bash -n` passe sur le script modifié, et la suite complète a
  été dry-runnée avec un faux binaire `maestro` (tous les flows, y compris
  `notifications.yaml`, s'enchaînent et sont bien rapportés `✅`). Relecture
  manuelle des deux diffs `.tsx` (ajout d'une seule prop `testID` chacun,
  aucun changement de logique). `tsc --noEmit`/`npm install` non tentés avec
  plus de détail que les sessions précédentes : limitation déjà confirmée et
  documentée (réseau du sandbox cloud bloqué, `ENOTFOUND registry.npmjs.org`,
  revérifié cette session avec le même résultat).
- **Branche B (test E2E réel) non tentée ce run** : `get_device_info` répond
  (Mac joignable), mais `connectedFolders` est revenu vide — contrairement au
  run précédent (flow event-review) qui avait pour la première fois un
  dossier connecté. Conforme à la procédure : pas de tentative de
  contournement par contrôle d'écran macOS pour une branche B qui n'a même
  pas de dossier connecté (ce contournement ne s'applique qu'à un
  `device_bash` incapable malgré un dossier connecté, pas à son absence).
  Branche A suivie à la place.
- **Changement de workflow (décision explicite de l'utilisateur, 2026-10-19)
  reçu dans les instructions de cette tâche planifiée** : ce pipeline ne crée
  plus de branches ni de Pull Requests — tout commit va directement sur
  `main`. Les PR #2 à #7 mentionnées dans les sessions précédentes
  correspondent à l'ancien workflow ; les anciennes PR encore ouvertes (s'il
  en reste) sont volontairement laissées de côté, à traiter manuellement par
  l'utilisateur s'il le souhaite.
- **Nouvelle limite trouvée sur l'auto-enchaînement (`fire_trigger`)** :
  contrairement aux runs précédents où l'échec était `bound_device_absent`
  (Mac non lié), ce run obtient un refus différent — **le classificateur de
  sécurité "auto mode" de la plateforme bloque explicitement l'action
  "Cowork Run Routine Now"** (message : permission refusée par le
  classificateur, action non contournable depuis la session). Donc même
  quand le blocage `bound_device_absent` ne s'applique pas, l'auto-
  enchaînement immédiat via `fire_trigger` reste indisponible pour cette
  tâche planifiée dans ce mode d'exécution — ce n'est pas un bug côté code
  du projet, rien à corriger ici. Le filet de sécurité (cron horaire déjà
  configuré sur cette tâche) reste donc le seul mécanisme de reprise tant
  que ce point n'est pas réglé par l'utilisateur côté réglages de la tâche
  planifiée (si un réglage permettant l'auto-enchaînement existe).

## Fait (session pipeline — flow event-review + découverte architecture Mac)

- **`.maestro/event-review.yaml` écrit** (item 6 du backlog "Flows Maestro
  manquants" ci-dessous) : contrairement aux flows précédents (comptes
  générés à la volée), ce flow s'appuie sur le compte de test participante
  déjà seedé (`supabase/dev-seed-test-participant.sql`), car **il n'existe
  aucune façon de créer un événement déjà passé via l'UI**
  (`minimumDate: new Date()` sur le formulaire de création,
  `app/event/create.tsx`). Le seed insère donc directement un événement
  terminé (id fixe `c0000000-0000-0000-0000-000000000099`, organisé par le
  premier organisateur de démo) avec une inscription confirmée pour le
  compte de test, ainsi qu'une notification `event_reminder` dédiée. Le
  flow se connecte (`runFlow: login.yaml`), ouvre les notifications, tape
  sur cette notification, vérifie que le détail de l'événement + la section
  Avis s'affichent, note 5 étoiles + commentaire, envoie, et vérifie que la
  moyenne/le commentaire apparaissent. Idempotent (upsert côté
  `handleSubmitReview`). Ajouté à `scripts/run-maestro-suite.sh`, dans le
  groupe gated par `TEST_PASSWORD` (comme `login.yaml`/`smoke_navigation.yaml`,
  puisqu'il dépend du compte seedé).
  **Vrai manque produit trouvé en écrivant ce flow** : l'app n'a **aucun
  écran listant les événements passés d'une participante** — le seul moyen
  de retomber sur le détail d'un événement terminé pour le noter est de
  taper sur une notification qui le référence (`event_reminder`/
  `event_update`). Si cette notification n'existe plus (supprimée, jamais
  générée, ou l'utilisatrice n'a pas vu l'événement passer), **il n'y a
  aujourd'hui aucun moyen dans l'UI de laisser un avis a posteriori.** Pas
  corrigé dans cette session (ajouter un onglet/section "Mes événements"
  avec historique est une vraie feature, pas un correctif ponctuel) —
  suggestion ajoutée au backlog "En cours / à faire ensuite" ci-dessous.
  TestID ajoutés : `app/(tabs)/index.tsx` et `app/(tabs)/profile.tsx`
  (`button-notifications` sur la cloche), `app/notifications.tsx`
  (`notification-row-event-{eventId}` par ligne, calculé depuis
  `payload.event_id`), `app/event/[id].tsx` (`button-rate-star-{1..5}`,
  `input-review-comment`, `button-submit-review`).
  Validation faite ici : le YAML parse comme deux documents valides
  (`pyyaml`), `bash -n` passe sur le script, et le script a été dry-runné
  avec un faux binaire `maestro` — avec et sans `TEST_PASSWORD` — pour
  vérifier le câblage. `tsc --noEmit` n'a pas pu tourner (voir plus bas,
  limitation déjà documentée, `npm install` a aussi été retenté cette
  session et bloqué par le réseau du sandbox cloud — `ENOTFOUND
  registry.npmjs.org`).
- **Découverte importante — le pont Mac (`device_bash`) tourne dans une VM
  Linux isolée, pas directement sur macOS** : pour la première fois, un
  dossier était bien connecté à cette session (`connectedFolders` non vide
  — contrairement à tous les runs précédents qui butaient sur ce point).
  Mais une fois dedans, `xcrun`, `xcode-select`, `mdfind` et `maestro` sont
  tous introuvables, `/Applications` est vide côté `device_bash`, et le
  réseau sortant de cette session device est bloqué par un proxy même vers
  des hôtes normalement accessibles (`curl` vers `github.com`,
  `api.github.com`, `registry.npmjs.org` → 403 du proxy). Conclusion : même
  dossier connecté, **`device_bash` ne peut pas piloter Xcode
  Simulator/Maestro CLI** — ce n'est pas (seulement) une histoire de
  dossier non connecté comme supposé dans toutes les notes précédentes,
  c'est une limite d'architecture plus profonde (sandbox Linux séparé du
  vrai système macOS).
  **Contournement utilisé pour quand même avancer** : comme `git fetch`
  réseau était aussi bloqué depuis cette session device, le dossier Mac a
  été mis à jour avec les 5 derniers flows mergés (`69c96c0` → `0ac537a`)
  en transférant un `git bundle` depuis le sandbox cloud via
  `device_commit_files` puis `git fetch <bundle> && git merge --ff-only`
  en local sur le Mac (aucune opération réseau nécessaire côté Mac). A
  aussi fallu `device_request_delete_permission` sur le dossier pour que
  `git merge`/les fichiers de verrou `.git/*.lock` fonctionnent (suppression
  désactivée par défaut dans un dossier connecté). Des copies locales
  non trackées des 5 fichiers `.maestro/*.yaml` existaient déjà dans le
  dossier (probablement un essai manuel antérieur) — vérifiées identiques
  aux versions mergées avant d'être écrasées, rien perdu.
  **Décision à prendre par l'utilisateur** (ajoutée aux "Décisions en
  attente" ci-dessous) : soit accepter que la branche E2E réelle du
  pipeline (branche B) reste bloquée tant que `device_bash` n'a pas un vrai
  accès macOS, soit envisager l'alternative via les outils de contrôle
  d'écran natif (`computer_*`, capture d'écran + clics/clavier réels sur le
  Mac) pour ouvrir Terminal.app et taper les commandes à la main — solution
  possible en théorie mais **pas tentée cette session sans accord explicite**
  (ça impliquerait que le pipeline prenne visuellement le contrôle de
  l'écran/souris/clavier du Mac à chaque run, ce qui est un changement
  d'UX non anodin si l'utilisateur est en train d'utiliser sa machine à ce
  moment-là).

## Fait (session pipeline autonome — flow channel-post-and-poll)

- **`.maestro/channel-post-and-poll.yaml` écrit** (item 5 du backlog "Flows
  Maestro manquants" ci-dessous) : une organisatrice ("Camille Moreau")
  publie un post puis un sondage à deux options dans son propre canal ;
  une participante ("Lea Petit") devient son amie (demande + acceptation,
  même mécanique que `friend-request-flow.yaml`), atteint son canal via
  l'onglet "Mes amies" → profil → "Voir son canal", puis vote sur le
  sondage (vérifié via le texte "1 vote" affiché après le vote).
  Comptes indépendants des autres flows, ajouté à
  `scripts/run-maestro-suite.sh`.
- **Bug bloquant trouvé et corrigé en écrivant ce flow, pas seulement un
  problème de test** : il n'existait **aucun point d'entrée dans l'UI**
  permettant à une organisatrice d'atteindre son propre canal
  (`app/channel/[id].tsx`), donc aucune façon de publier un post ou un
  sondage depuis l'app, malgré le canal créé automatiquement par le
  trigger SQL `trg_ensure_organizer_channel`. Cause : une organisatrice
  n'est pas auto-abonnée à son propre canal (absente de l'onglet Canaux,
  qui ne liste que les canaux suivis — voir le commentaire dans
  `app/(tabs)/channels.tsx`), et `app/profile/[id].tsx` (qui porte le
  bouton "Voir son canal") ne s'affiche que pour le profil d'une AUTRE
  personne, jamais pour soi-même. **Corrigé** en ajoutant un bouton "Voir
  mon canal" sur l'onglet Profil (`app/(tabs)/profile.tsx`, visible
  seulement pour une organisatrice, charge l'id du canal via une requête
  `channels.organizer_id = profile.id`). À signaler à l'utilisatrice si
  elle a déjà cherché comment publier dans son canal sans trouver
  comment.
- **TestID ajoutés** (nécessaires pour ce flow, aucun n'existait avant sur
  ces écrans) : `app/channel/[id].tsx` (`button-toggle-new-post`,
  `input-post-content`, `button-publish-post`, `button-toggle-new-poll`,
  `input-poll-question`, `input-poll-option-{index}`,
  `button-create-poll`), `app/(tabs)/profile.tsx`
  (`button-view-own-channel`, le nouveau bouton ci-dessus),
  `app/profile/[id].tsx` (`button-view-channel` sur le bouton "Voir son
  canal" déjà existant).
  Validation faite ici : le fichier YAML parse comme deux documents
  valides (`pyyaml`), `bash -n` passe sur le script, et le script a été
  dry-runné avec un faux binaire `maestro` pour vérifier le câblage
  (variables d'env, nom du flow) — **pas d'exécution réelle sur
  Simulator** (Mac non connecté à ce run, voir plus bas), à valider pour
  de vrai au prochain run si le Mac est disponible. `tsc --noEmit` sur les
  trois fichiers `.tsx` modifiés ne remonte que des erreurs déjà connues
  de ce sandbox (modules introuvables faute de `node_modules`, `any`
  implicites préexistants) — aucune ne porte sur les props `testID`
  ajoutées ni sur le nouvel état `ownChannelId`.
- **PR dupliquée fermée** : un run précédent ou concurrent à celui-ci a
  ouvert [PR #6](https://github.com/nicolaspoda/Sistrs/pull/6)
  (`feat/signup-organizer-maestro-flow`) à partir d'une vue de `main`
  antérieure à la fusion de `signup-organizer.yaml` (PR #2) — elle
  dupliquait donc un flow déjà mergé et entrait en conflit avec `main`.
  Fermée avec un commentaire explicatif, aucune action utilisateur
  nécessaire.
  **Point de vigilance pour les prochains runs** : [PR
  #5](https://github.com/nicolaspoda/Sistrs/pull/5)
  (`feat/maestro-messaging-send-flow`, item 4 du backlog) est ouverte et
  prête (mergeable, pas de conflit) mais **pas encore mergée** au moment
  d'écrire ceci — ne pas la recréer/dupliquer dans un prochain run tant
  qu'elle n'est pas fusionnée ou fermée.
- **Mac joignable mais toujours aucun dossier connecté à cette session**
  (même constat que tous les runs précédents) : `get_device_info` répond,
  mais `connectedFolders` est vide. Branche B (test E2E réel sur
  Simulator) non tentée ce run pour cette raison — branche A (tâche de
  dev) suivie à la place, qui n'a pas besoin du Mac.

## Fait (session pipeline autonome — flow messaging-send)

- **`.maestro/messaging-send.yaml` écrit** (item 4 du backlog "Flows
  Maestro manquants" ci-dessous — les items 1, 2 et 3 ont déjà des PR
  ouvertes non encore mergées, voir note juste après la liste) : envoi
  réel d'un message dans une conversation, dans les deux sens (pas juste
  lecture d'un message non lu déjà seedé). Deux comptes participantes
  créés dans le même flow — "Inès Caron" (créée en premier, jamais
  connectée avant d'accepter la demande d'amitié, juste là pour être
  trouvable) et "Alice Perrin" (connectée tout de suite après sa
  création, envoie la demande d'amitié puis démarre une nouvelle
  conversation depuis le profil d'"Inès Caron" une fois la demande
  acceptée) — puis reconnexion avec "Inès Caron" pour vérifier la
  réception du premier message (aperçu dans la liste des conversations +
  contenu dans le fil) et envoyer une réponse.
  Ajouté les testID manquants (aucun n'existait avant sur ces trois
  fichiers) : `app/(tabs)/friends.tsx` (`input-friend-search`,
  `button-send-friend-request`, `button-accept-friend-request`),
  `app/profile/[id].tsx` (`button-message-friend`) et
  `app/conversation/[id].tsx` (`input-message`, `button-send-message`).
  Wiré dans `scripts/run-maestro-suite.sh` avec ses propres comptes de
  test générés, indépendants de `signup-participant.yaml`.
  Validation faite ici : le flow parse correctement (`pyyaml`), `bash -n`
  passe sur le script, et le script a été testé en isolation avec un faux
  binaire `maestro` pour vérifier le câblage (variables d'env, nom du
  flow, contenu des messages) — **le flow n'a en revanche pas pu être
  exécuté sur un vrai Simulator** (voir point suivant), donc il reste à
  valider pour de vrai au prochain run si le Mac est disponible. `tsc
  --noEmit` ne peut pas tourner complètement dans ce sandbox (pas de
  `node_modules` installés — limitation déjà documentée plus bas, pas
  liée à ce changement) ; vérifié que les erreurs listées pour les trois
  fichiers modifiés sont toutes de cette nature et aucune ne porte sur
  les props `testID` ajoutées.
- **Mac joignable mais aucun dossier connecté à cette session** (même
  constat que lors des runs précédents qui ont ouvert les PR #2, #3 et
  #4) : `get_device_info` répond (Mac allumé/déverrouillé, app Claude
  desktop ouverte), mais `connectedFolders` est vide. Sans dossier
  connecté, `device_bash` ne peut pas opérer dans le dossier du projet,
  donc aucune étape nécessitant le Mac (Simulator, Metro, Maestro,
  identifiants de seed) n'a pu être tentée ce run — branche B (test E2E)
  non exécutée pour cette raison, pas par choix (le marqueur "Dernier run
  E2E vert" reste donc inchangé, voir plus bas). **Action utilisateur
  suggérée** (répétée des runs précédents, toujours pas réglée) :
  connecter le dossier du projet à la tâche planifiée pour que les
  prochains runs puissent réellement piloter le Simulator.
- **Auto-enchaînement (`fire_trigger`) volontairement pas retenté ce
  run** : le run précédent (flow `friend-request-flow.yaml`, voir PR
  encore ouverte) avait déjà buté sur exactement ce même blocage
  (`bound_device_absent`, Mac non lié côté tâche planifiée) en tentant de
  s'auto-redéclencher dans une situation identique (Mac joignable mais
  pas de dossier connecté). Conformément à la consigne "ne pas
  redéclencher si le run précédent a buté sur exactement le même
  blocage", ce run ne retente pas l'auto-enchaînement — le cron horaire
  reprendra la suite (item 5, `channel-post-and-poll.yaml`) à son
  prochain passage.

## Fait (session pipeline autonome — flow friend-request-flow)

- **`.maestro/friend-request-flow.yaml` écrit** (item 3 du backlog "Flows
  Maestro manquants" ci-dessous — les items 1 et 2 ont déjà des PR ouvertes
  non encore mergées, voir note juste après la liste) : envoi réel d'une
  demande d'amitié (pas juste lecture d'une demande seedée) et acceptation
  côté second compte. Deux comptes participantes créés dans le même
  flow — "Camille Rousseau" (créée en premier, jamais connectée avant la
  fin du flow, juste là pour être trouvable) et "Manon Girard" (connectée
  tout de suite après sa création, envoie la demande puis se déconnecte) —
  puis reconnexion avec "Camille Rousseau" pour vérifier la demande reçue,
  l'accepter, et confirmer que "Manon Girard" apparaît bien dans "Mes
  amies" ensuite.
  Ajouté de nouvelles testID (aucune n'existait avant sur cet écran) :
  `app/(tabs)/friends.tsx` (`tab-requests`/`tab-friends`/`tab-find`,
  `input-friend-search`, `button-send-friend-request`,
  `button-accept-friend-request`, `button-decline-friend-request`) et
  `app/(tabs)/profile.tsx` (`button-sign-out`, nécessaire pour changer de
  compte dans ce flow). Wiré dans `scripts/run-maestro-suite.sh` avec ses
  propres comptes de test générés, indépendants de `signup-participant.yaml`.
  Validation faite ici : les deux documents YAML (config + liste de
  commandes) parsent correctement (`pyyaml`), `bash -n` passe sur le script,
  et le script a été testé en isolation avec un faux binaire `maestro` pour
  vérifier le câblage (variables d'env, nom du flow) — **le flow n'a en
  revanche pas pu être exécuté sur un vrai Simulator** (voir point suivant),
  donc il reste à valider pour de vrai au prochain run si le Mac est
  disponible. `tsc --noEmit` ne peut pas tourner complètement dans ce
  sandbox (pas de `node_modules` installés, flag `--jsx` manquant côté
  `expo/tsconfig.base` introuvable — limitation déjà documentée plus bas,
  pas liée à ce changement) ; vérifié que les erreurs listées pour les deux
  fichiers modifiés sont toutes de cette nature et aucune ne porte sur les
  props `testID` ajoutées.
- **Mac joignable mais aucun dossier connecté à cette session** (même
  constat que lors des runs précédents qui ont ouvert les PR #2 et #3) :
  `get_device_info` répond (Mac allumé/déverrouillé, app Claude desktop
  ouverte), mais `connectedFolders` est vide. Sans dossier connecté,
  `device_bash` ne peut pas opérer dans le dossier du projet, donc aucune
  étape nécessitant le Mac (Simulator, Metro, Maestro, identifiants de
  seed) n'a pu être tentée ce run — branche B (test E2E) non exécutée pour
  cette raison, pas par choix (le marqueur "Dernier run E2E vert" reste
  donc inchangé, voir plus bas). **Action utilisateur suggérée** (répétée
  des runs précédents, toujours pas réglée) : connecter le dossier du
  projet à la tâche planifiée pour que les prochains runs puissent
  réellement piloter le Simulator.
- **`fire_trigger` (auto-enchaînement) échoue quand le Mac n'est pas
  connecté** : en fin de ce run, comme il restait du travail non bloqué
  dans le backlog (item 4 `messaging-send.yaml`), l'auto-déclenchement
  prévu à l'étape 6 a été tenté mais a échoué avec
  `bound_device_absent` ("The computer this routine runs on isn't
  connected"). La tâche planifiée semble donc exiger un device lié pour
  se redéclencher elle-même, même quand le run suivant n'a besoin que de
  la branche "dev" (jamais du Mac). Conséquence : sans Mac connecté,
  l'auto-enchaînement ne fonctionne pas du tout, seul le cron horaire
  (s'il est bien actif) peut relancer un run — à vérifier/ajuster côté
  réglages de la tâche planifiée (désactiver l'exigence de device liée au
  déclenchement manuel, si possible) la prochaine fois que le Mac est
  disponible.

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

## Fait (session pipeline autonome — 1er run réel)

- **Repo renommé `sistrs` → `Sistrs`** côté GitHub (`nicolaspoda/Sistrs`) ;
  remote local du clone cloud mis à jour en conséquence.
- **`.maestro/signup-organizer.yaml` écrit** (item 1 du backlog "Flows
  Maestro manquants" ci-dessous) : inscription complète côté organisatrice
  (rôle `organizer`, pièce d'identité via raccourci dev, étape "Tes
  spécialités" sans limite à 5 contrairement aux préférences participante,
  bypass Face ID dev), puis reconnexion avec le compte tout juste créé et
  vérification que l'onglet Profil affiche "Spécialités" — confirme que le
  rôle et les spécialités sont bien persistés côté serveur (ce même insert
  de rôle déclenche aussi le trigger SQL `ensure_organizer_channel`, non
  observable directement dans l'UI puisque l'organisatrice n'est pas
  auto-abonnée à son propre canal — voir le commentaire en tête du fichier
  pour le détail). Ajouté à `scripts/run-maestro-suite.sh` avec son propre
  compte de test généré, indépendant de `signup-participant.yaml`.
  Validation faite ici : les deux documents YAML de chaque flow (config +
  liste de commandes) parsent correctement (`pyyaml`), et le script a été
  testé en isolation avec un faux binaire `maestro` pour vérifier le
  câblage (variables d'env, répartition des flows) — **le flow n'a en
  revanche pas pu être exécuté sur un vrai Simulator** (voir point
  suivant), donc il reste à valider pour de vrai au prochain run si le Mac
  est disponible.
- **Mac joignable mais aucun dossier connecté à cette session** :
  `get_device_info` répond (Mac allumé/déverrouillé, app Claude desktop
  ouverte), mais `connectedFolders` est vide — contrairement à ce qui
  était attendu, le dossier du projet n'était pas déjà connecté à cette
  session planifiée. Sans dossier connecté, `device_bash` ne peut pas
  opérer dans le dossier du projet, donc aucune étape nécessitant le Mac
  (Simulator, Metro, Maestro, identifiants de seed) n'a pu être tentée ce
  run — branche B (test E2E) non exécutée pour cette raison, pas par choix
  (le marqueur "Dernier run E2E vert" reste donc inchangé, voir plus bas).
  **Action utilisateur suggérée** : connecter le dossier du projet à la
  tâche planifiée (dans les réglages de la tâche planifiée côté app Claude
  desktop) pour que les prochains runs puissent réellement piloter le
  Simulator.

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
  1. ~~`signup-organizer.yaml`~~ **fait le 2026-10-19** (voir section
     "Fait (session pipeline autonome — 1er run réel)" plus haut) — écrit
     et câblé dans le script, pas encore exécuté pour de vrai sur
     Simulator (Mac non connecté à ce run, voir plus haut). Mergé via PR #2.
  2. ~~`event-create-and-register.yaml`~~ **fait le 2026-10-19** (voir
     section "Fait (session pipeline autonome — 2e run réel)" plus haut) —
     écrit et câblé dans le script, pas encore exécuté pour de vrai sur
     Simulator (Mac non connecté à ce run non plus). A aussi permis de
     trouver et corriger un vrai bug (dates par défaut de création
     d'événement inversées, voir plus haut). Mergé via PR #3.
  3. ~~`friend-request-flow.yaml`~~ **fait le 2026-10-19** (voir section
     "Fait (session pipeline autonome — flow friend-request-flow)" plus
     haut) — écrit et câblé dans le script, pas encore exécuté pour de vrai
     sur Simulator (Mac non connecté à ce run, voir plus haut). Mergé via
     PR #4.
  4. ~~`messaging-send.yaml`~~ **fait le 2026-10-19** (voir section "Fait
     (session pipeline autonome — flow messaging-send)" plus haut) — écrit
     et câblé dans le script, pas encore exécuté pour de vrai sur
     Simulator (Mac non connecté à ce run non plus). Mergé via PR #5.
  5. ~~`channel-post-and-poll.yaml`~~ **fait le 2026-10-19** (voir section
     "Fait (session pipeline autonome — flow channel-post-and-poll)" plus
     haut) — écrit et câblé dans le script, pas encore exécuté pour de
     vrai sur Simulator (Mac non connecté à ce run). A aussi permis de
     trouver et corriger un vrai bug bloquant (aucun point d'entrée UI
     vers le canal d'une organisatrice). Mergé via PR #7.
  6. ~~`event-review.yaml`~~ **fait le 2026-10-19** (voir section "Fait
     (session pipeline — flow event-review + découverte architecture Mac)"
     plus haut) — écrit et câblé dans le script (groupe gated par
     `TEST_PASSWORD`, dépend du seed), pas encore exécuté pour de vrai sur
     Simulator. Committé directement sur `main` (avant le changement de
     workflow sans PR, mais sans PR ouverte non plus — voir le commit
     `a5cfd77`).
  7. ~~`notifications.yaml`~~ **fait le 2026-10-19** (voir section "Fait
     (session pipeline autonome — flow notifications)" plus haut) — écrit
     et câblé dans le script, pas encore exécuté pour de vrai sur Simulator
     (Mac non connecté à ce run). Committé directement sur `main` (nouveau
     workflow sans branche/PR).
  8. ~~`profile-edit-avatar.yaml`~~ **fait le 2026-10-19** (voir section
     "Fait (session pipeline autonome — flow profile-edit-avatar)" plus
     haut) — écrit et câblé dans le script, pas encore exécuté pour de vrai
     sur Simulator (Mac non connecté à ce run non plus). Nécessite un
     nouveau raccourci développeur `link-dev-use-test-avatar` dans
     `app/(tabs)/profile.tsx` (même principe que `link-dev-use-test-id`)
     pour éviter de piloter le vrai sélecteur de photos natif.
  Chaque nouveau flow doit être ajouté à `scripts/run-maestro-suite.sh` et
  à la liste lue par la tâche planifiée.
  **Note** : les items 1 à 8 sont désormais TOUS écrits et câblés dans le
  script (mergés via PR #2-#7 pour les items 1-5, committés directement sur
  `main` pour les items 6-8 après le changement de workflow). **Aucun n'a
  encore été exécuté pour de vrai sur un Simulator** — la branche B du
  pipeline reste bloquée (voir "Pipeline dev → test E2E → fix en boucle"
  plus bas). **Le backlog "Flows Maestro manquants" est maintenant vide** :
  il n'y a plus de tâche de dev non bloquée connue dans cette liste pour un
  futur run — la prochaine étape logique du pipeline est la Branche B
  (premier vrai run E2E sur Simulator, dès qu'un run a enfin accès au Mac
  avec `device_bash` fonctionnel ou, à défaut, au contrôle d'écran macOS
  autorisé). Si un futur run ne peut toujours pas accéder au Mac, il n'y a
  plus, à ce stade, de tâche de dev de secours dans cette liste — voir
  "Backlog prêt pour le store" ci-dessous (explicitement à ne traiter
  qu'une fois la couverture E2E avancée, donc pas avant un premier run
  Branche B réussi) et "En cours / à faire ensuite" (tâches majoritairement
  manuelles côté utilisateur ou décisions produit, pas des tâches
  automatisables par le pipeline).
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
