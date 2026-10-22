// Discord without a library: sending via the REST API, joins and leaves via
// the gateway (a WebSocket connection Discord keeps open to push events).
import { config } from './config.js';

const API = 'https://discord.com/api/v10';
const GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json';

// GUILDS (1) and GUILD_MEMBERS (2). The latter is "privileged" and must be
// enabled in the Developer Portal under Bot -> Server Members Intent.
const INTENTS = (1 << 0) | (1 << 1);

// Reconnecting does not help with these codes - something about the token
// or settings is wrong. Messages are German: Jean reads them in the journal.
const FATAL = {
  4004: 'Token ungueltig (DISCORD_TOKEN pruefen)',
  4010: 'Ungueltiger Shard',
  4011: 'Sharding noetig',
  4012: 'Ungueltige API-Version',
  4013: 'Ungueltige Intents',
  4014: 'Server Members Intent ist im Developer Portal nicht eingeschaltet',
};

export async function api(route, options = {}) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}/${route}`, {
      ...options,
      headers: {
        Authorization: `Bot ${config.discordToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DiscordBot (https://github.com/Lassandriel, 1.0)',
        ...options.headers,
      },
    });
    if (res.status === 429 && attempt < 5) {
      const { retry_after = 1 } = await res.json().catch(() => ({}));
      await new Promise((r) => setTimeout(r, retry_after * 1000 + 100));
      continue;
    }
    if (!res.ok) {
      throw new Error(`Discord ${options.method ?? 'GET'} ${route}: ${res.status} ${await res.text()}`);
    }
    return res.status === 204 ? null : res.json();
  }
}

// mentions: who the message may actually ping. Nobody by default, so a
// title containing "@everyone" cannot wake the whole server.
export function send(channel, content, mentions = {}) {
  return api(`channels/${channel}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      content: content.slice(0, 2000),
      allowed_mentions: { parse: [], users: mentions.users ?? [], roles: mentions.roles ?? [] },
    }),
  });
}

// Keeps the gateway connection and calls onEvent(name, data) for every
// event. If the connection drops it resumes, so no events are lost.
export function connect(onEvent) {
  let session = null; // { id, url } from READY
  let seq = null; // last sequence number, needed for heartbeat and resume
  let timer = null;
  let acked = true;

  const open = (resume) => {
    const ws = new WebSocket(resume && session ? `${session.url}/?v=10&encoding=json` : GATEWAY);
    const sendOp = (op, d) => ws.send(JSON.stringify({ op, d }));

    const heartbeat = () => {
      if (!acked) {
        // No answer to the last heartbeat: the connection is dead.
        console.warn('Gateway antwortet nicht mehr, verbinde neu');
        ws.close(4000);
        return;
      }
      acked = false;
      sendOp(1, seq);
    };

    ws.addEventListener('message', (e) => {
      const { op, d, s, t } = JSON.parse(e.data);
      if (s != null) seq = s;

      switch (op) {
        case 10: // Hello
          acked = true;
          clearInterval(timer);
          setTimeout(heartbeat, d.heartbeat_interval * Math.random());
          timer = setInterval(heartbeat, d.heartbeat_interval);
          if (resume && session) {
            sendOp(6, { token: config.discordToken, session_id: session.id, seq });
          } else {
            sendOp(2, {
              token: config.discordToken,
              intents: INTENTS,
              properties: { os: 'linux', browser: 'nhywyll-discord', device: 'nhywyll-discord' },
            });
          }
          break;
        case 11: // heartbeat acknowledged
          acked = true;
          break;
        case 1: // Discord wants a heartbeat right now
          sendOp(1, seq);
          break;
        case 7: // Discord asks us to reconnect
          ws.close(4000);
          break;
        case 9: // invalid session; d says whether it can be resumed
          if (!d) { session = null; seq = null; }
          setTimeout(() => ws.close(4000), 1000 + Math.random() * 4000);
          break;
        case 0:
          if (t === 'READY') {
            session = { id: d.session_id, url: d.resume_gateway_url };
            console.log(`Discord: angemeldet als ${d.user.username}`);
          } else if (t === 'RESUMED') {
            console.log('Discord: Verbindung fortgesetzt');
          }
          Promise.resolve(onEvent(t, d)).catch((err) => console.error(`Fehler bei ${t}:`, err.message));
          break;
      }
    });

    ws.addEventListener('close', (e) => {
      clearInterval(timer);
      if (FATAL[e.code]) {
        console.error(`Discord hat die Verbindung beendet: ${FATAL[e.code]} (${e.code})`);
        process.exit(1);
      }
      console.warn(`Gateway getrennt (${e.code}), neuer Versuch in 5 s`);
      setTimeout(() => open(true), 5000);
    });

    ws.addEventListener('error', () => {}); // 'close' follows anyway
  };

  open(false);
}
