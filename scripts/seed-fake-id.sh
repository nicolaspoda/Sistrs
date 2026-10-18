#!/bin/bash
# Ajoute la fausse pièce d'identité de test dans la pellicule Photos du
# Simulator iOS actuellement démarré ("booted"). Idempotent : peut être
# relancé sans risque, ça ajoute juste une copie de plus dans la
# pellicule (les flows Maestro sélectionnent la première photo de la
# grille, donc la plus récemment ajoutée).
#
# Usage : ./scripts/seed-fake-id.sh [chemin-vers-image]
# Par défaut, cherche ~/Desktop/fake-id-card.png.
set -euo pipefail

IMAGE_PATH="${1:-$HOME/Desktop/fake-id-card.png}"

if [ ! -f "$IMAGE_PATH" ]; then
  echo "Image introuvable : $IMAGE_PATH" >&2
  echo "Génère-la ou passe le bon chemin en argument." >&2
  exit 1
fi

BOOTED=$(xcrun simctl list devices | grep "(Booted)" | head -1 || true)
if [ -z "$BOOTED" ]; then
  echo "Aucun Simulator n'est démarré (xcrun simctl list devices)." >&2
  exit 1
fi

xcrun simctl addmedia booted "$IMAGE_PATH"
echo "Photo ajoutée à la pellicule du Simulator démarré : $BOOTED"
