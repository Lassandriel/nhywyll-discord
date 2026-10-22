# Nhywyll-Discord-Bot

Ersetzt Sapphire auf **The Aviary**: Willkommen/Abschied und Feeds (Twitch
live, YouTube, Bluesky). Container **103**, Dienst `nhywyll-discord`,
Ordner `/opt/nhywyll-discord`, Nutzer `bot`. Warum so: `PLAN.md`.

- **Keine Abhaengigkeiten einfuehren** - Gateway laeuft ueber das eingebaute
  `WebSocket`, wie EventSub im Twitch-Bot.
- **Nicht pushen**, ohne dass Jean es will. Ein Push wird nach spaetestens
  zehn Minuten live (Update-Timer).
- Token stehen nur in `/opt/nhywyll-discord/.env`, nie in den Chat holen.
- Der "Mini-PC" in Discord ist **nicht** dieser Bot, sondern der Webhook der
  Plattenwarnung auf dem Wirt.
- Lokal testen ohne echtes Discord: `fetch` und `WebSocket` vor dem Import von
  `src/index.js` durch Attrappen ersetzen und Ereignisse (op 10 Hello,
  READY, GUILD_MEMBER_ADD/REMOVE, op 7) einspielen. YouTube und Bluesky
  lassen sich gegen die echten Quellen pruefen; `daten/` danach loeschen.
