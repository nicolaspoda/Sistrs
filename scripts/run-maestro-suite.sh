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
#   event-create-and-register.yaml tournent dans tous les cas, chacun
#   avec ses propres comptes générés à la volée)
set -uo pipefail
cd "$(dirname "$0")/.."

REPORT_DIR=".maestro/reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="$REPORT_DIR/run-$TIMESTAMP.log"
mkdir -p "$REPORT_DIR"

SIGNUP_EMAIL="test.e2e.$(date +%s)@example.com"
SIGNUP_PASSWORD="motdepasse123"

# Identifiants dédiés à event-create-and-register.yaml (deux comptes,
# organisatrice + participante) — un suffixe "org"/"part" pour rester
# unique même si ce script tourne deux fois dans la même seconde que les
# variables ci-dessus.
EVENT_ORGANIZER_EMAIL="test.e2e.org.$(date +%s)@example.com"
EVENT_ORGANIZER_PASSWORD="motdepasse123"
EVENT_PARTICIPANT_EMAIL="test.e2e.part.$(date +%s)@example.com"
EVENT_PARTICIPANT_PASSWORD="motdepasse123"
EVENT_TITLE="Soiree karaoke E2E $(date +%s)"

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

run_flow "event-create-and-register.yaml" \
  --env ORGANIZER_EMAIL="$EVENT_ORGANIZER_EMAIL" \
  --env ORGANIZER_PASSWORD="$EVENT_ORGANIZER_PASSWORD" \
  --env PARTICIPANT_EMAIL="$EVENT_PARTICIPANT_EMAIL" \
  --env PARTICIPANT_PASSWORD="$EVENT_PARTICIPANT_PASSWORD" \
  --env EVENT_TITLE="$EVENT_TITLE"

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
