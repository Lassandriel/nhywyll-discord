// Nhywyll-Discord-Bot: Willkommen/Abschied und Social-Feeds fuer The Aviary.
// Ersetzt Sapphire, siehe PLAN.md.
import { konfig, texte, fuelle, pruefeGrundkonfig } from './konfig.js';
import { api, sende, verbinde } from './discord.js';
import { twitchStream, youtubeVideos, blueskyPosts } from './feeds.js';
import { lies, setze, neueEintraege } from './stand.js';

const SEKUNDE = 1000;
const MINUTE = 60 * SEKUNDE;
const NEUSTART_PAUSE = 30 * MINUTE; // Stream nach Absturz neu gestartet: nicht noch mal melden

pruefeGrundkonfig();

// --- Willkommen und Abschied ----------------------------------------------

// Nur Ereignisse vom Server, zu dem der Willkommenskanal gehoert - sollte der
// Bot noch auf anderen Servern sein, bleiben die aussen vor.
const { guild_id: server } = await api(`channels/${konfig.kanalWillkommen}`);

verbinde(async (ereignis, d) => {
  if (d?.guild_id !== server || d.user?.bot) return;
  const name = d.user.global_name || d.user.username;
  if (ereignis === 'GUILD_MEMBER_ADD') {
    await sende(konfig.kanalWillkommen, fuelle(texte.willkommen, { nutzer: `<@${d.user.id}>`, name }), { nutzer: [d.user.id] });
    console.log(`Willkommen: ${name}`);
  } else if (ereignis === 'GUILD_MEMBER_REMOVE') {
    await sende(konfig.kanalWillkommen, fuelle(texte.abschied, { name }));
    console.log(`Abschied: ${name}`);
  }
});

// --- Feeds ----------------------------------------------------------------

async function pruefeTwitch() {
  const stream = await twitchStream();
  if (!stream) return;
  const letzte = lies('twitch') ?? {};
  if (letzte.id === stream.id) return;
  setze('twitch', { id: stream.id, zeit: Date.now() });
  if (letzte.zeit && Date.now() - letzte.zeit < NEUSTART_PAUSE) {
    console.log(`Twitch: neuer Stream ${stream.id} kurz nach dem letzten, keine zweite Meldung`);
    return;
  }
  const ping = konfig.rolleLive ? `<@&${konfig.rolleLive}>` : '';
  await sende(
    konfig.kanalTwitch,
    fuelle(texte.twitch, { ...stream, ping, kanal: konfig.twitchKanal }).replace(/ +\n/g, '\n'),
    { rollen: konfig.rolleLive ? [konfig.rolleLive] : [] },
  );
  console.log(`Twitch: live gemeldet (${stream.titel})`);
}

async function pruefeYoutube() {
  for (const video of neueEintraege('youtube', await youtubeVideos())) {
    await sende(konfig.kanalYoutube, fuelle(video.short ? texte.youtube_short : texte.youtube, video));
    console.log(`YouTube: ${video.titel}`);
  }
}

async function pruefeBluesky() {
  for (const post of neueEintraege('bluesky', await blueskyPosts())) {
    await sende(konfig.kanalBluesky, fuelle(texte.bluesky, post));
    console.log(`Bluesky: ${post.link}`);
  }
}

// Jede Quelle fuer sich: faellt eine aus, laufen die anderen weiter.
function regelmaessig(name, aufgabe, abstand) {
  const lauf = () => aufgabe().catch((f) => console.error(`${name}: ${f.message}`));
  lauf();
  setInterval(lauf, abstand);
}

regelmaessig('Twitch', pruefeTwitch, MINUTE);
regelmaessig('YouTube', pruefeYoutube, 5 * MINUTE);
regelmaessig('Bluesky', pruefeBluesky, 5 * MINUTE);
console.log(`Feeds aktiv: twitch.tv/${konfig.twitchKanal}, YouTube ${konfig.youtubeKanalId}, Bluesky @${konfig.blueskyHandle}`);
