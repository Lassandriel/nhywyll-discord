#!/bin/bash
#
# Holt neue Commits von GitHub und startet den Bot neu.
# Wird per systemd-Timer regelmaessig aufgerufen (siehe nhywyll-discord-update.timer).
#
set -euo pipefail

cd "$(dirname "$0")/.."

git fetch --quiet origin main
LOKAL=$(git rev-parse HEAD)
FERN=$(git rev-parse origin/main)

if [ "$LOKAL" = "$FERN" ]; then
  exit 0   # nichts Neues, ruhig wieder schlafen legen
fi

echo "Neue Version gefunden: ${LOKAL:0:7} -> ${FERN:0:7}"
git merge --ff-only origin/main

# Der Bot hat keine Abhaengigkeiten - es gibt also nichts zu installieren.
systemctl restart nhywyll-discord
echo "Aktualisiert auf $(git rev-parse --short HEAD)"
