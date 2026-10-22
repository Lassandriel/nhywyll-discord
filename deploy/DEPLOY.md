# Den Discord-Bot auf den Server bringen

Laeuft in **Container 103** neben dem Twitch-Bot. Node 24, Git und der
Nutzer `bot` sind dort schon da (siehe `Server/Twitch Bot/deploy/DEPLOY.md`).
Keine eingehende Verbindung noetig, also kein Tailscale, keine Portfreigabe.

## 1. Discord-Anwendung anlegen (Jean, im Browser)

1. https://discord.com/developers/applications -> **New Application**
   (Name z. B. "Aviary"; Bild und Name sieht man im Server).
2. Links **Bot**:
   - **Reset Token** -> Token kopieren, kommt spaeter in die `.env`.
     Nicht in den Chat geben.
   - **Server Members Intent** einschalten (sonst sieht der Bot keine
     Beitritte und beendet sich mit Code 4014).
   - **Public Bot** ausschalten, damit niemand sonst ihn einladen kann.
3. Einladen - in diesem Link `APP_ID` durch die **Application ID** von der
   Seite *General Information* ersetzen:
   `https://discord.com/oauth2/authorize?client_id=APP_ID&scope=bot&permissions=3072`
   (3072 = Kanaele sehen + Nachrichten senden, mehr braucht er nicht).
4. In Discord **Einstellungen -> Erweitert -> Entwicklermodus** an, dann
   Rechtsklick auf den Willkommens- und den Feed-Kanal -> **Kanal-ID
   kopieren**.

## 2. Repo auf GitHub

Repo `Lassandriel/nhywyll-discord` anlegen und vom PC pushen. Es enthaelt
keine Geheimnisse (die stehen nur in der `.env`), deshalb reicht **oeffentlich**:
dann klont der Container per HTTPS ohne Schluessel.

Soll es privat sein: Ein Deploy-Key gilt bei GitHub nur fuer **ein** Repo,
der Schluessel des Twitch-Bots geht also nicht. Dann einen zweiten Schluessel
`/root/.ssh/id_discord` erzeugen, als Deploy-Key eintragen, in
`/root/.ssh/config` einen Host `github-discord` mit diesem Schluessel anlegen
und als `git@github-discord:Lassandriel/nhywyll-discord.git` klonen.

## 3. Einrichten (Proxmox-Shell)

```bash
pct exec 103 -- bash -c '[ -d /opt/nhywyll-discord ] || git clone https://github.com/Lassandriel/nhywyll-discord.git /opt/nhywyll-discord; bash /opt/nhywyll-discord/deploy/einrichten.sh'
```

Beim ersten Mal legt das nur die `.env` an. Ausfuellen:

```bash
pct exec 103 -- nano /opt/nhywyll-discord/.env
```

`TWITCH_CLIENT_ID` und `TWITCH_CLIENT_SECRET` sind dieselben wie in
`/opt/nhywyll-bot/.env`. Danach denselben Einrichtungsbefehl wie oben noch
einmal - jetzt startet er Bot und Update-Timer und zeigt das Protokoll.

Im Protokoll muss stehen: *Discord: angemeldet als ...* und *Feeds aktiv*.
Beim ersten Lauf werden vorhandene Videos und Posts nur gemerkt, nicht
gepostet. Laeuft gerade ein Stream, wird er einmal gemeldet.

## Danach

- Sapphire in Discord vom Server entfernen (oder dessen Willkommen und Feeds
  abschalten), sonst kommt alles doppelt.
- Texte aendern: `texts.json` bearbeiten und pushen, der Container zieht
  spaetestens zehn Minuten spaeter nach.
- Protokoll: `pct exec 103 -- journalctl -u nhywyll-discord -n 30 --no-pager`

## Stolperstein Developer Portal

**Public Bot** ausschalten scheitert mit "Private application cannot have a
default authorization link", solange unter **Installation -> Install Link**
noch *Discord Provided Link* steht. Erst dort auf **None** stellen und
speichern. Achtung: Schlaegt das Speichern fehl, ist **nichts** gespeichert,
auch nicht der Server Members Intent.
