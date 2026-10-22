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
- [x] Discord-Anwendung "Bird Keeper" angelegt (App-ID 1562728450135949373), Token in `.env`
- [x] Auf CT 103 eingerichtet, laeuft seit 22.10.2026 (online in Discord)
- [x] Slash-Befehle fuer Mods (/help, /test, /text, /status), englisch, lokal
  geprueft. Jeans Wunsch 22.10.2026: Bedienung in Discord statt im Dashboard,
  Tests in den Mod-Kanal #notepad.
- [x] Bird Keeper in #notepad freigegeben (Jean), `DISCORD_KANAL_TEST` gesetzt
- [ ] Sapphire: Willkommen und Feeds abschalten bzw. Bot entfernen (Jean)
- [ ] Erste echte Meldungen beobachten: Beitritt, naechster Stream, naechstes Video und Post

## Kanaele auf The Aviary (nicht geheim)

| Zweck | Kanal-ID |
|---|---|
| Willkommen/Abschied (#welcome) | 1129339394067791894 |
| Twitch live | 1129340984711458836 |
| YouTube (#clips) | 1310991220805468201 |
| Bluesky | 1320739525797875812 |
| Mod-Tests /test (#notepad) | 1254337518405423165 |

`DISCORD_KANAL_FEEDS` steht in der `.env` auf dem Twitch-Kanal, weil
`einrichten.sh` es verlangt; die drei eigenen Kanaele gehen vor.
