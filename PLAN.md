# Nhywyll-Discord-Bot - Plan und Stand

Ersetzt **Sapphire** auf dem Discord-Server **The Aviary** (Nhywyll).

## Entscheidungen (22.10.2026)

- **Warum nicht Sapphire:** Feeds kamen zu spaet oder gar nicht, Bedienung
  umstaendlich (Dashboard, Bezahlschranke).
- **Gebraucht werden nur:** Willkommens- und Abschiedsnachricht (ohne
  Auto-Rolle) und Social-Feeds fuer **Twitch live, YouTube, Bluesky**.
  Reaction Roles, Moderation, Logs, Embeds-Baukasten: nicht gewuenscht.
- **Eigener Bot, eigenes Projekt** (Jeans Wahl), nicht in den Twitch-Bot
  eingebaut. Der "Mini-PC" in Discord ist kein Bot, sondern nur der Webhook
  der Plattenwarnung auf dem Wirt - ein Webhook kann nur posten und sieht
  keine Beitritte, also taugt er nicht fuer Willkommensnachrichten.
- **Laeuft auf Container 103** neben dem Twitch-Bot (eigener Dienst
  `nhywyll-discord`, Ordner `/opt/nhywyll-discord`, gleicher Nutzer `bot`).
  Node 24 ist dort schon da, ein eigener Container waere Verschwendung.
- **Keine Abhaengigkeiten**, wie beim Twitch-Bot: Discord-Gateway ueber das
  in Node eingebaute `WebSocket`, alles andere ueber `fetch`.
- **Feeds per Abfrage**, alle 60 s (Twitch) bzw. 5 Min. (YouTube, Bluesky):
  - Twitch: Helix `streams` mit App-Token (Client-Credentials). Dafuer reicht
    Client-ID und -Secret der vorhandenen Twitch-Anwendung.
  - YouTube: oeffentlicher RSS-Feed, kein API-Schluessel. Kanal-ID
    `UCtiQlpGmReXnpVsuhRxdc3A` (gemessen am 22.10.2026, Handle @Nhywyll).
    Shorts stehen mit `/shorts/`-Link im selben Feed.
  - Bluesky: oeffentliche API `getAuthorFeed`, ohne Antworten und Reposts.
- **Keine Flut nach Neustart:** Gesehene IDs stehen in `daten/stand.json`.
  Beim allerersten Lauf eines Feeds wird nur gemerkt, nicht gepostet.
- **Live-Meldung einmal je Stream:** Merkt sich die Stream-ID; startet der
  Stream nach einem Absturz innerhalb von 30 Min. neu, wird nicht noch
  einmal gemeldet.
- **Texte auf Englisch** (Server und Stream sind englisch), sie stehen in `texte.json` (Platzhalter in `{geschweiften}`), damit
  Jean sie ohne Code aendern kann.

## Stand

- [x] Gateway mit Willkommen/Abschied
- [x] Feeds Twitch, YouTube, Bluesky
- [x] Lokal geprueft (Feeds gegen die echten Quellen, Texte, Gateway-Logik)
- [x] GitHub-Repo `Lassandriel/nhywyll-discord` (oeffentlich) angelegt und gepusht, 22.10.2026
- [ ] Discord-Anwendung anlegen, Token in `.env` (Jean, siehe DEPLOY.md)
- [ ] Auf CT 103 einrichten, Sapphire danach vom Server werfen
