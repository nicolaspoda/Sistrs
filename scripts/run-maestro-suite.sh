#!/bin/bash
# Lance tous les parcours Maestro du dossier .maestro/ à la suite et
# écrit un rapport horodaté dans .maestro/reports/. Le Simulator doit
# déjà être démarré avec le bon build dev-client (npx expo run:ios) et
# Metro doit tourner (npm start).
#
# Usage : ./scripts/run-maestro-suite.sh
# Optionnel : TEST_PASSWORD=le-mot-de-passe-du-seed ./scripts/run-maestro-suite.sh
#   (mot de passe du compte de test.participante@sistrs.app, voir
#   supabase/dev-seed-test-participant.sql — sans ça, login.yaml,
#   smoke_navigation.yaml et event-review.yaml sont sautés ;
#   signup-participant.yaml, signup-organizer.yaml,
#   event-create-and-register.yaml, friend-request-flow.yaml,
#   messaging-send.yaml, channel-post-and-poll.yaml, poll-revote.yaml et
#   notifications.yaml tournent dans tous les cas, chacun avec ses propres
#   comptes générés à la volée)
set -uo pipefail
cd "$(dirname "$0")/.."

REPORT_DIR=".maestro/reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="$REPORT_DIR/run-$TIMESTAMP.log"
mkdir -p "$REPORT_DIR"

SIGNUP_EMAIL="test.e2e.$(date +%s)@example.com"
SIGNUP_PASSWORD="motdepasse123"
SIGNUP_ORGANIZER_EMAIL="test.e2e.organizer.$(date +%s)@example.com"
SIGNUP_ORGANIZER_PASSWORD="motdepasse123"

# Identifiants dédiés à event-create-and-register.yaml (deux comptes,
# organisatrice + participante) — un suffixe "org"/"part" pour rester
# unique même si ce script tourne deux fois dans la même seconde que les
# variables ci-dessus.
EVENT_ORGANIZER_EMAIL="test.e2e.org.$(date +%s)@example.com"
EVENT_ORGANIZER_PASSWORD="motdepasse123"
EVENT_PARTICIPANT_EMAIL="test.e2e.part.$(date +%s)@example.com"
EVENT_PARTICIPANT_PASSWORD="motdepasse123"
EVENT_TITLE="Soiree karaoke E2E $(date +%s)"

# Identifiants dédiés à friend-request-flow.yaml (deux comptes, future
# amie + demandeuse) — un suffixe "friend"/"requester" pour rester unique
# même si ce script tourne deux fois dans la même seconde que les
# variables ci-dessus.
FRIEND_REQUEST_FRIEND_EMAIL="test.e2e.friend.$(date +%s)@example.com"
FRIEND_REQUEST_FRIEND_PASSWORD="motdepasse123"
FRIEND_REQUEST_REQUESTER_EMAIL="test.e2e.requester.$(date +%s)@example.com"
FRIEND_REQUEST_REQUESTER_PASSWORD="motdepasse123"

# Identifiants dédiés à messaging-send.yaml (deux comptes, destinataire +
# expéditrice) — un suffixe "receiver"/"sender" pour rester unique même si
# ce script tourne deux fois dans la même seconde que les variables
# ci-dessus.
MESSAGING_RECEIVER_EMAIL="test.e2e.receiver.$(date +%s)@example.com"
MESSAGING_RECEIVER_PASSWORD="motdepasse123"
MESSAGING_SENDER_EMAIL="test.e2e.sender.$(date +%s)@example.com"
MESSAGING_SENDER_PASSWORD="motdepasse123"
MESSAGING_FIRST_MESSAGE="Coucou, ça te dit la soirée de vendredi ?"
MESSAGING_REPLY_MESSAGE="Oui carrément, j'ai hâte !"

# Identifiants dédiés à channel-post-and-poll.yaml (deux comptes,
# organisatrice + participante) — un suffixe "channel.org"/"channel.part"
# pour rester unique même si ce script tourne deux fois dans la même
# seconde que les variables ci-dessus.
CHANNEL_ORGANIZER_EMAIL="test.e2e.channel.org.$(date +%s)@example.com"
CHANNEL_ORGANIZER_PASSWORD="motdepasse123"
CHANNEL_PARTICIPANT_EMAIL="test.e2e.channel.part.$(date +%s)@example.com"
CHANNEL_PARTICIPANT_PASSWORD="motdepasse123"

# Identifiants dédiés à poll-revote.yaml (deux comptes, organisatrice +
# participante) — un suffixe "revote.org"/"revote.part" pour rester unique
# même si ce script tourne deux fois dans la même seconde que les
# variables ci-dessus. Ce flow réutilise channel-post-and-poll.yaml via
# runFlow pour son setup : des comptes dédiés évitent toute interférence
# avec le run de channel-post-and-poll.yaml plus haut dans cette même
# suite.
REVOTE_ORGANIZER_EMAIL="test.e2e.revote.org.$(date +%s)@example.com"
REVOTE_ORGANIZER_PASSWORD="motdepasse123"
REVOTE_PARTICIPANT_EMAIL="test.e2e.revote.part.$(date +%s)@example.com"
REVOTE_PARTICIPANT_PASSWORD="motdepasse123"

# Identifiants dédiés à notifications.yaml (deux comptes, destinataire +
# expéditrice de la demande d'amitié qui déclenche la notification) — un
# suffixe "notif.recipient"/"notif.sender" pour rester unique même si ce
# script tourne deux fois dans la même seconde que les variables
# ci-dessus.
NOTIF_RECIPIENT_EMAIL="test.e2e.notif.recipient.$(date +%s)@example.com"
NOTIF_RECIPIENT_PASSWORD="motdepasse123"
NOTIF_SENDER_EMAIL="test.e2e.notif.sender.$(date +%s)@example.com"
NOTIF_SENDER_PASSWORD="motdepasse123"

# Identifiants dédiés à profile-edit-avatar.yaml (un seul compte
# participante) — suffixe "profile" pour rester unique même si ce script
# tourne deux fois dans la même seconde que les variables ci-dessus.
PROFILE_EMAIL="test.e2e.profile.$(date +%s)@example.com"
PROFILE_PASSWORD="motdepasse123"

# Identifiants dédiés à cancel-registration.yaml (deux comptes,
# organisatrice + participante) — un suffixe "cancel.org"/"cancel.part"
# pour rester unique même si ce script tourne deux fois dans la même
# seconde que les variables ci-dessus.
CANCEL_ORGANIZER_EMAIL="test.e2e.cancel.org.$(date +%s)@example.com"
CANCEL_ORGANIZER_PASSWORD="motdepasse123"
CANCEL_PARTICIPANT_EMAIL="test.e2e.cancel.part.$(date +%s)@example.com"
CANCEL_PARTICIPANT_PASSWORD="motdepasse123"
CANCEL_EVENT_TITLE="Soiree quiz E2E $(date +%s)"

{
  echo "=== Run Maestro $TIMESTAMP ==="
  echo "Email généré pour signup-participant : $SIGNUP_EMAIL"
  echo "Email généré pour signup-organizer : $SIGNUP_ORGANIZER_EMAIL"
  echo ""
} | tee "$REPORT_FILE"

FAILED=0

run_flow() {
  local flow="$1"
  shift
  {
    echo ""
    echo "--- $flow ---"
  } | tee -a "$REPORT_FILE"

  if maestro test "$@" ".maestro/$flow" >>"$REPORT_FILE" 2>&1; then
    echo "✅ $flow" | tee -a "$REPORT_FILE"
  else
    echo "❌ $flow — voir le détail dans $REPORT_FILE" | tee -a "$REPORT_FILE"
    FAILED=1
  fi
}

run_flow "signup-participant.yaml" \
  --env SIGNUP_EMAIL="$SIGNUP_EMAIL" \
  --env SIGNUP_PASSWORD="$SIGNUP_PASSWORD"

run_flow "signup-organizer.yaml" \
  --env SIGNUP_EMAIL="$SIGNUP_ORGANIZER_EMAIL" \
  --env SIGNUP_PASSWORD="$SIGNUP_ORGANIZER_PASSWORD"

run_flow "event-create-and-register.yaml" \
  --env ORGANIZER_EMAIL="$EVENT_ORGANIZER_EMAIL" \
  --env ORGANIZER_PASSWORD="$EVENT_ORGANIZER_PASSWORD" \
  --env PARTICIPANT_EMAIL="$EVENT_PARTICIPANT_EMAIL" \
  --env PARTICIPANT_PASSWORD="$EVENT_PARTICIPANT_PASSWORD" \
  --env EVENT_TITLE="$EVENT_TITLE"

run_flow "friend-request-flow.yaml" \
  --env FRIEND_EMAIL="$FRIEND_REQUEST_FRIEND_EMAIL" \
  --env FRIEND_PASSWORD="$FRIEND_REQUEST_FRIEND_PASSWORD" \
  --env REQUESTER_EMAIL="$FRIEND_REQUEST_REQUESTER_EMAIL" \
  --env REQUESTER_PASSWORD="$FRIEND_REQUEST_REQUESTER_PASSWORD"

run_flow "messaging-send.yaml" \
  --env RECEIVER_EMAIL="$MESSAGING_RECEIVER_EMAIL" \
  --env RECEIVER_PASSWORD="$MESSAGING_RECEIVER_PASSWORD" \
  --env SENDER_EMAIL="$MESSAGING_SENDER_EMAIL" \
  --env SENDER_PASSWORD="$MESSAGING_SENDER_PASSWORD" \
  --env FIRST_MESSAGE="$MESSAGING_FIRST_MESSAGE" \
  --env REPLY_MESSAGE="$MESSAGING_REPLY_MESSAGE"

run_flow "channel-post-and-poll.yaml" \
  --env ORGANIZER_EMAIL="$CHANNEL_ORGANIZER_EMAIL" \
  --env ORGANIZER_PASSWORD="$CHANNEL_ORGANIZER_PASSWORD" \
  --env PARTICIPANT_EMAIL="$CHANNEL_PARTICIPANT_EMAIL" \
  --env PARTICIPANT_PASSWORD="$CHANNEL_PARTICIPANT_PASSWORD"

run_flow "poll-revote.yaml" \
  --env ORGANIZER_EMAIL="$REVOTE_ORGANIZER_EMAIL" \
  --env ORGANIZER_PASSWORD="$REVOTE_ORGANIZER_PASSWORD" \
  --env PARTICIPANT_EMAIL="$REVOTE_PARTICIPANT_EMAIL" \
  --env PARTICIPANT_PASSWORD="$REVOTE_PARTICIPANT_PASSWORD"

run_flow "notifications.yaml" \
  --env RECIPIENT_EMAIL="$NOTIF_RECIPIENT_EMAIL" \
  --env RECIPIENT_PASSWORD="$NOTIF_RECIPIENT_PASSWORD" \
  --env SENDER_EMAIL="$NOTIF_SENDER_EMAIL" \
  --env SENDER_PASSWORD="$NOTIF_SENDER_PASSWORD"

run_flow "profile-edit-avatar.yaml" \
  --env PROFILE_EMAIL="$PROFILE_EMAIL" \
  --env PROFILE_PASSWORD="$PROFILE_PASSWORD"

run_flow "cancel-registration.yaml" \
  --env ORGANIZER_EMAIL="$CANCEL_ORGANIZER_EMAIL" \
  --env ORGANIZER_PASSWORD="$CANCEL_ORGANIZER_PASSWORD" \
  --env PARTICIPANT_EMAIL="$CANCEL_PARTICIPANT_EMAIL" \
  --env PARTICIPANT_PASSWORD="$CANCEL_PARTICIPANT_PASSWORD" \
  --env EVENT_TITLE="$CANCEL_EVENT_TITLE"

if [ -n "${TEST_PASSWORD:-}" ]; then
  run_flow "login.yaml" \
    --env TEST_EMAIL="test.participante@sistrs.app" \
    --env TEST_PASSWORD="$TEST_PASSWORD"
  run_flow "smoke_navigation.yaml" \
    --env TEST_EMAIL="test.participante@sistrs.app" \
    --env TEST_PASSWORD="$TEST_PASSWORD"
  run_flow "event-review.yaml" \
    --env TEST_EMAIL="test.participante@sistrs.app" \
    --env TEST_PASSWORD="$TEST_PASSWORD"
else
  {
    echo ""
    echo "⏭️  login.yaml, smoke_navigation.yaml et event-review.yaml sautés (TEST_PASSWORD non fourni)"
  } | tee -a "$REPORT_FILE"
fi

echo "" | tee -a "$REPORT_FILE"
echo "Rapport complet : $REPORT_FILE"

exit $FAILED
