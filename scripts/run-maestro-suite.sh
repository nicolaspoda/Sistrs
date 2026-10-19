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
#   friend-request-flow.yaml tournent dans tous les cas, chacun avec ses
#   propres comptes générés à la volée)
set -uo pipefail
cd "$(dirname "$0")/.."

REPORT_DIR=".maestro/reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="$REPORT_DIR/run-$TIMESTAMP.log"
mkdir -p "$REPORT_DIR"

SIGNUP_EMAIL="test.e2e.$(date +%s)@example.com"
SIGNUP_PASSWORD="motdepasse123"

# Identifiants dédiés à friend-request-flow.yaml (deux comptes, future
# amie + demandeuse) — un suffixe "friend"/"requester" pour rester unique
# même si ce script tourne deux fois dans la même seconde que les
# variables ci-dessus.
FRIEND_REQUEST_FRIEND_EMAIL="test.e2e.friend.$(date +%s)@example.com"
FRIEND_REQUEST_FRIEND_PASSWORD="motdepasse123"
FRIEND_REQUEST_REQUESTER_EMAIL="test.e2e.requester.$(date +%s)@example.com"
FRIEND_REQUEST_REQUESTER_PASSWORD="motdepasse123"

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

run_flow "friend-request-flow.yaml" \
  --env FRIEND_EMAIL="$FRIEND_REQUEST_FRIEND_EMAIL" \
  --env FRIEND_PASSWORD="$FRIEND_REQUEST_FRIEND_PASSWORD" \
  --env REQUESTER_EMAIL="$FRIEND_REQUEST_REQUESTER_EMAIL" \
  --env REQUESTER_PASSWORD="$FRIEND_REQUEST_REQUESTER_PASSWORD"

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
