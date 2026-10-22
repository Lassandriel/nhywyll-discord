#!/bin/bash
#
# Richtet den Discord-Bot in Container 103 ein. Darf beliebig oft laufen:
# fehlt die .env, legt es sie aus der Vorlage an und hoert auf; ist sie
# ausgefuellt, schaltet es Bot und Update-Timer ein.
#
set -euo pipefail

ORDNER=/opt/nhywyll-discord
cd "$ORDNER"

id bot >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin bot
mkdir -p daten
chown bot:bot daten

if [ ! -f .env ]; then
  cp .env-template .env
  chown bot:bot .env
  chmod 600 .env
  echo "Vorlage angelegt: $ORDNER/.env"
  echo "Jetzt ausfuellen (pct exec 103 -- nano $ORDNER/.env) und dieses Skript noch einmal starten."
  exit 0
fi

for noetig in DISCORD_TOKEN DISCORD_KANAL_WILLKOMMEN DISCORD_KANAL_FEEDS TWITCH_CLIENT_ID TWITCH_CLIENT_SECRET; do
  if ! grep -q "^$noetig=." .env; then
    echo "In $ORDNER/.env fehlt noch $noetig - erst ausfuellen, dann noch einmal starten."
    exit 1
  fi
done

cp deploy/nhywyll-discord.service deploy/nhywyll-discord-update.service deploy/nhywyll-discord-update.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now nhywyll-discord-update.timer
systemctl enable nhywyll-discord
systemctl restart nhywyll-discord
sleep 5
journalctl -u nhywyll-discord -n 15 --no-pager
