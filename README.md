# Nhywyll-Discord-Bot

Eigener Bot fuer den Discord-Server **The Aviary**, ersetzt Sapphire.

- **Willkommen / Abschied** im Willkommenskanal (Texte in `texte.json`).
- **Twitch live** - Meldung spaetestens eine Minute nach Streamstart, optional
  mit Rollen-Ping.
- **YouTube** (Videos und Shorts) und **Bluesky** (eigene Posts, ohne
  Antworten und Reposts) - alle fuenf Minuten nachgesehen.

Node 22+, keine Abhaengigkeiten. Laeuft auf Container 103 als Dienst
`nhywyll-discord`. Einrichtung: [deploy/DEPLOY.md](deploy/DEPLOY.md).
Entscheidungen und Stand: [PLAN.md](PLAN.md).

## Lokal starten

```bash
cp .env-template .env   # ausfuellen
npm start
```

## Aufbau

| Datei | Zweck |
|---|---|
| `src/index.js` | Start, Willkommen/Abschied, Feed-Schleifen |
| `src/discord.js` | REST (`sende`) und Gateway (`verbinde`) |
| `src/feeds.js` | Twitch-, YouTube-, Bluesky-Abfragen |
| `src/stand.js` | Gemeldete IDs in `daten/stand.json` |
| `src/konfig.js` | `.env`, `texte.json`, Platzhalter |
