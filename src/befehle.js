// Slash-Befehle fuer Mods: /help, /test, /text, /status. Auf Englisch, weil
// die Mods englisch sprechen. Sichtbar nur fuer Leute mit "Server verwalten";
// in Discord unter Servereinstellungen -> Integrationen -> Bird Keeper laesst
// sich das auf eine Mod-Rolle erweitern.
import { konfig } from './konfig.js';
import { api, sende } from './discord.js';
import { twitchStream, youtubeVideos, blueskyPosts } from './feeds.js';
import { ARTEN, PLATZHALTER, text, istGeaendert, setzeText, setzeZurueck } from './texte.js';
import { laufzeit } from './stand.js';
import * as meldung from './meldungen.js';

const SERVER_VERWALTEN = String(1 << 5);
const PRIVAT = 64; // Antwort sieht nur, wer den Befehl geschickt hat

const artWahl = {
  name: 'type', description: 'Which message', type: 3, required: true,
  choices: ARTEN.map((a) => ({ name: a, value: a })),
};

const BEFEHLE = [
  { name: 'help', description: 'What Bird Keeper does and how to change it' },
  {
    name: 'test', description: 'Post a sample message to the mod test channel (no pings)',
    options: [artWahl],
  },
  {
    name: 'text', description: 'Show or change the message texts',
    options: [
      { name: 'show', description: 'Show all texts and their placeholders', type: 1 },
      {
        name: 'set', description: 'Change a text (use \\n for a line break)', type: 1,
        options: [artWahl, { name: 'text', description: 'New text', type: 3, required: true, max_length: 1500 }],
      },
      { name: 'reset', description: 'Back to the default text', type: 1, options: [artWahl] },
    ],
  },
  { name: 'status', description: 'Are the feeds working? When did they last check?' },
].map((b) => ({ ...b, default_member_permissions: SERVER_VERWALTEN, contexts: [0] }));

// Meldet die Befehle beim Server an. Ueberschreibt jedes Mal den ganzen
// Satz, damit entfernte Befehle auch in Discord verschwinden.
export async function meldeBefehleAn(anwendung, server) {
  await api(`applications/${anwendung}/guilds/${server}/commands`, {
    method: 'PUT', body: JSON.stringify(BEFEHLE),
  });
  console.log(`Slash-Befehle angemeldet: ${BEFEHLE.map((b) => `/${b.name}`).join(' ')}`);
}

const antworte = (i, inhalt) => api(`interactions/${i.id}/${i.token}/callback`, {
  method: 'POST',
  body: JSON.stringify({ type: 4, data: { content: inhalt.slice(0, 2000), flags: PRIVAT, allowed_mentions: { parse: [] } } }),
});

// Fuer Befehle, die laenger als die 3 s brauchen koennen, die Discord fuer
// eine Antwort laesst: erst "denkt nach..." melden, dann nachreichen.
const warte = (i) => api(`interactions/${i.id}/${i.token}/callback`, {
  method: 'POST', body: JSON.stringify({ type: 5, data: { flags: PRIVAT } }),
});
const reicheNach = (i, inhalt) => api(`webhooks/${i.application_id}/${i.token}/messages/@original`, {
  method: 'PATCH', body: JSON.stringify({ content: inhalt.slice(0, 2000), allowed_mentions: { parse: [] } }),
});

const vor = (zeit) => {
  if (!zeit) return 'never';
  const s = Math.round((Date.now() - zeit) / 1000);
  return s < 120 ? `${s} s ago` : s < 7200 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`;
};

const HILFE = `**Bird Keeper** - welcome/leave messages and social feeds for The Aviary.

**What it posts on its own**
- Welcome and leave messages in <#${konfig.kanalWillkommen}>
- Twitch live in <#${konfig.kanalTwitch}> (checked every minute)
- New YouTube videos and Shorts in <#${konfig.kanalYoutube}> (every 5 min)
- New Bluesky posts in <#${konfig.kanalBluesky}> (every 5 min)

**Commands** (only visible to mods)
\`/test type\` - post a sample of a message${konfig.kanalTest ? ` to <#${konfig.kanalTest}>` : ' here'}, nobody gets pinged
\`/text show\` - show all texts and their placeholders
\`/text set type text\` - change a text, \`\\n\` makes a new line
\`/text reset type\` - back to the default text
\`/status\` - when each feed last worked, and the last error

Texts are changed right away, no restart needed. Placeholders like \`{title}\` are filled in by the bot.`;

async function beispiel(art, nutzer) {
  switch (art) {
    case 'welcome': return meldung.willkommen(nutzer);
    case 'leave': return meldung.abschied(nutzer);
    case 'twitch':
      return meldung.live(await twitchStream() ?? { titel: 'Sample stream title', spiel: 'Minecraft' });
    case 'youtube':
    case 'youtube_short': {
      const videos = await youtubeVideos();
      const passend = videos.find((v) => v.short === (art === 'youtube_short')) ?? videos[0];
      return meldung.video({ ...passend, short: art === 'youtube_short' });
    }
    case 'bluesky': return meldung.post((await blueskyPosts())[0]);
  }
}

// Wird bei jedem INTERACTION_CREATE aufgerufen.
export async function beiBefehl(i) {
  if (i.type !== 2) return; // nur Slash-Befehle
  const nutzer = i.member?.user ?? i.user;
  const unter = i.data.options?.[0];
  const wert = (name, optionen = i.data.options) => optionen?.find((o) => o.name === name)?.value;
  console.log(`/${i.data.name}${unter?.type === 1 ? ` ${unter.name}` : ''} von ${nutzer.username}`);

  switch (i.data.name) {
    case 'help':
      return antworte(i, HILFE);

    case 'test': {
      const art = wert('type');
      const ziel = konfig.kanalTest || i.channel_id;
      await warte(i);
      try {
        const { inhalt } = await beispiel(art, nutzer);
        // Ohne "erwaehnen": im Test wird niemand angepingt.
        await sende(ziel, `🧪 **Test: ${art}**\n${inhalt}`);
        return reicheNach(i, `Sample sent to <#${ziel}>.`);
      } catch (f) {
        return reicheNach(i, `Test failed: \`${f.message.slice(0, 300)}\``);
      }
    }

    case 'text': {
      if (unter.name === 'show') {
        const zeilen = ARTEN.map((a) => `**${a}**${istGeaendert(a) ? ' (changed)' : ''} - placeholders: ${PLATZHALTER[a]}\n\`\`\`\n${text(a)}\n\`\`\``);
        return antworte(i, zeilen.join('\n'));
      }
      const art = wert('type', unter.options);
      if (unter.name === 'reset') {
        setzeZurueck(art);
        return antworte(i, `**${art}** is back to the default:\n\`\`\`\n${text(art)}\n\`\`\``);
      }
      setzeText(art, wert('text', unter.options).replace(/\\n/g, '\n'));
      return antworte(i, `**${art}** changed. Try it with \`/test type:${art}\`.\n\`\`\`\n${text(art)}\n\`\`\``);
    }

    case 'status': {
      const zeilen = Object.entries(laufzeit.quellen).map(([name, q]) =>
        `**${name}**: last OK ${vor(q.ok)}${q.fehler ? ` - last error ${vor(q.fehlerZeit)}: \`${q.fehler.slice(0, 150)}\`` : ''}`);
      return antworte(i, `Started ${vor(laufzeit.start)}.\n${zeilen.join('\n')}`);
    }
  }
}
