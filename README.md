# Nhywyll-Discord-Bot

Eigener Bot fuer den Discord-Server **The Aviary**, ersetzt Sapphire.

- **Willkommen / Abschied** im Willkommenskanal (Texte in `texte.json`).
- **Twitch live** - Meldung spaetestens eine Minute nach Streamstart, optional
  mit Rollen-Ping.
- **YouTube** (Videos und Shorts) und **Bluesky** (eigene Posts, ohne
  Antworten und Reposts) - alle fuenf Minuten nachgesehen.

## Bedienung in Discord (englisch, nur fuer Mods)

| Befehl | Was er tut |
|---|---|
| `/help` | Ueberblick ueber Bot und Befehle |
| `/test type` | Probemeldung in den Mod-Kanal (`DISCORD_KANAL_TEST`), ohne Ping |
| `/text show` | Alle Texte mit ihren Platzhaltern |
| `/text set type text` | Text aendern, `\n` = neue Zeile; wirkt sofort |
| `/text reset type` | Zurueck zum Standard aus `texte.json` |
| `/status` | Wann jeder Feed zuletzt geklappt hat, letzter Fehler |

Sichtbar nur fuer Leute mit **Server verwalten**. Fuer eine Mod-Rolle
freischalten: Servereinstellungen -> Integrationen -> Bird Keeper.
Per `/text set` geaenderte Texte stehen in `daten/stand.json` und gehen
`texte.json` vor - ein Update aus GitHub ueberschreibt sie nicht.

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
| `src/befehle.js` | Slash-Befehle fuer Mods |
| `src/meldungen.js` | Baut die Meldungen (Betrieb und `/test`) |
| `src/texte.js` | Standardtexte + Aenderungen der Mods, Platzhalter |
| `src/feeds.js` | Twitch-, YouTube-, Bluesky-Abfragen |
| `src/stand.js` | Gemeldete IDs in `daten/stand.json` |
| `src/konfig.js` | `.env` |
