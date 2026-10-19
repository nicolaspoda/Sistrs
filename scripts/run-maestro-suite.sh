#!/bin/bash
# Lance tous les parcours Maestro du dossier .maestro/ à la suite et
# écrit un rapport horodaté dans .maestro/reports/. Le Simulator doit
# déjà être démarré avec le bon build dev-client (npx expo run:ios) et
# Metro doit tourner (npm start).
#
# Usage : ./scripts/run-maestro-suite.sh
# Optionnel : TEST_PASSWORD=le-mot-de-passe-du-seed ./scripts/run-maestro-suite.sh
#   (mot de passe du compte de test.participante@sistrs.app, voir
#   supabase/dev-seed-test-participant.sql — sans ça, login.yaml et
#   smoke_navigation.yaml sont sautés ; signup-participant.yaml et
#   messaging-send.yaml tournent dans tous les cas, chacun avec ses propres
#   comptes générés à la volée)
set -uo pipefail
cd "$(dirname "$0")/.."

REPORT_DIR=".maestro/reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="$REPORT_DIR/run-$TIMESTAMP.log"
mkdir -p "$REPORT_DIR"

SIGNUP_EMAIL="test.e2e.$(date +%s)@example.com"
SIGNUP_PASSWORD="motdepasse123"

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

{
  echo "=== Run Maestro $TIMESTAMP ==="
  echo "Email généré pour signup-participant : $SIGNUP_EMAIL"
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

run_flow "messaging-send.yaml" \
  --env RECEIVER_EMAIL="$MESSAGING_RECEIVER_EMAIL" \
  --env RECEIVER_PASSWORD="$MESSAGING_RECEIVER_PASSWORD" \
  --env SENDER_EMAIL="$MESSAGING_SENDER_EMAIL" \
  --env SENDER_PASSWORD="$MESSAGING_SENDER_PASSWORD" \
  --env FIRST_MESSAGE="$MESSAGING_FIRST_MESSAGE" \
  --env REPLY_MESSAGE="$MESSAGING_REPLY_MESSAGE"

if [ -n "${TEST_PASSWORD:-}" ]; then
  run_flow "login.yaml" \
    --env TEST_EMAIL="test.participante@sistrs.app" \
    --env TEST_PASSWORD="$TEST_PASSWORD"
  run_flow "smoke_navigation.yaml" \
    --env TEST_EMAIL="test.participante@sistrs.app" \
    --env TEST_PASSWORD="$TEST_PASSWORD"
else
  {
    echo ""
    echo "⏭️  login.yaml et smoke_navigation.yaml sautés (TEST_PASSWORD non fourni)"
  } | tee -a "$REPORT_FILE"
fi

echo "" | tee -a "$REPORT_FILE"
echo "Rapport complet : $REPORT_FILE"

exit $FAILED
