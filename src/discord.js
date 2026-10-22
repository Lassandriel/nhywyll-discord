// Discord ohne Bibliothek: Senden ueber die REST-API, Beitritte und
// Austritte ueber das Gateway (eine WebSocket-Verbindung, die Discord
// offen haelt und ueber die es Ereignisse schickt).
import { konfig } from './konfig.js';

const API = 'https://discord.com/api/v10';
const GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json';

// GUILDS (1) und GUILD_MEMBERS (2). Letzteres ist "privilegiert" und muss im
// Developer Portal unter Bot -> Server Members Intent eingeschaltet sein.
const INTENTS = (1 << 0) | (1 << 1);

// Bei diesen Codes hilft Neuverbinden nicht - etwas an Token oder
// Einstellungen ist falsch.
const ENDGUELTIG = {
  4004: 'Token ungueltig (DISCORD_TOKEN pruefen)',
  4010: 'Ungueltiger Shard',
  4011: 'Sharding noetig',
  4012: 'Ungueltige API-Version',
  4013: 'Ungueltige Intents',
  4014: 'Server Members Intent ist im Developer Portal nicht eingeschaltet',
};

export async function api(pfad, optionen = {}) {
  for (let versuch = 1; ; versuch++) {
    const antwort = await fetch(`${API}/${pfad}`, {
      ...optionen,
      headers: {
        Authorization: `Bot ${konfig.discordToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DiscordBot (https://github.com/Lassandriel, 1.0)',
        ...optionen.headers,
      },
    });
    if (antwort.status === 429 && versuch < 5) {
      const { retry_after = 1 } = await antwort.json().catch(() => ({}));
      await new Promise((r) => setTimeout(r, retry_after * 1000 + 100));
      continue;
    }
    if (!antwort.ok) {
      throw new Error(`Discord ${optionen.method ?? 'GET'} ${pfad}: ${antwort.status} ${await antwort.text()}`);
    }
    return antwort.status === 204 ? null : antwort.json();
  }
}

// erwaehnen: wen die Nachricht wirklich anpingen darf. Ohne Angabe niemanden,
// damit ein Titel mit "@everyone" nicht den ganzen Server weckt.
export function sende(kanal, inhalt, erwaehnen = {}) {
  return api(`channels/${kanal}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      content: inhalt.slice(0, 2000),
      allowed_mentions: { parse: [], users: erwaehnen.nutzer ?? [], roles: erwaehnen.rollen ?? [] },
    }),
  });
}

// Haelt die Gateway-Verbindung und ruft bei jedem Ereignis
// beiEreignis(name, daten) auf. Bricht die Verbindung ab, wird
// fortgesetzt (resume), sodass keine Ereignisse verloren gehen.
export function verbinde(beiEreignis) {
  let sitzung = null; // { id, adresse } aus READY
  let folge = null; // letzte Sequenznummer, Discord braucht sie fuer Herzschlag und Resume
  let takt = null;
  let bestaetigt = true;

  const oeffne = (fortsetzen) => {
    const draht = new WebSocket(fortsetzen && sitzung ? `${sitzung.adresse}/?v=10&encoding=json` : GATEWAY);
    const schicke = (op, d) => draht.send(JSON.stringify({ op, d }));

    const herzschlag = () => {
      if (!bestaetigt) {
        // Keine Antwort auf den letzten Herzschlag: Verbindung ist tot.
        console.warn('Gateway antwortet nicht mehr, verbinde neu');
        draht.close(4000);
        return;
      }
      bestaetigt = false;
      schicke(1, folge);
    };

    draht.addEventListener('message', (e) => {
      const { op, d, s, t } = JSON.parse(e.data);
      if (s != null) folge = s;

      switch (op) {
        case 10: // Hello
          bestaetigt = true;
          clearInterval(takt);
          setTimeout(herzschlag, d.heartbeat_interval * Math.random());
          takt = setInterval(herzschlag, d.heartbeat_interval);
          if (fortsetzen && sitzung) {
            schicke(6, { token: konfig.discordToken, session_id: sitzung.id, seq: folge });
          } else {
            schicke(2, {
              token: konfig.discordToken,
              intents: INTENTS,
              properties: { os: 'linux', browser: 'nhywyll-discord', device: 'nhywyll-discord' },
            });
          }
          break;
        case 11: // Herzschlag bestaetigt
          bestaetigt = true;
          break;
        case 1: // Discord will sofort einen Herzschlag
          schicke(1, folge);
          break;
        case 7: // Discord bittet um Neuverbindung
          draht.close(4000);
          break;
        case 9: // Sitzung ungueltig; d sagt, ob sie fortsetzbar ist
          if (!d) { sitzung = null; folge = null; }
          setTimeout(() => draht.close(4000), 1000 + Math.random() * 4000);
          break;
        case 0:
          if (t === 'READY') {
            sitzung = { id: d.session_id, adresse: d.resume_gateway_url };
            console.log(`Discord: angemeldet als ${d.user.username}`);
          } else if (t === 'RESUMED') {
            console.log('Discord: Verbindung fortgesetzt');
          }
          Promise.resolve(beiEreignis(t, d)).catch((f) => console.error(`Fehler bei ${t}:`, f.message));
          break;
      }
    });

    draht.addEventListener('close', (e) => {
      clearInterval(takt);
      if (ENDGUELTIG[e.code]) {
        console.error(`Discord hat die Verbindung beendet: ${ENDGUELTIG[e.code]} (${e.code})`);
        process.exit(1);
      }
      console.warn(`Gateway getrennt (${e.code}), neuer Versuch in 5 s`);
      setTimeout(() => oeffne(true), 5000);
    });

    draht.addEventListener('error', () => {}); // close folgt ohnehin
  };

  oeffne(false);
}
