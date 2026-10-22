// Nhywyll-Discord-Bot: Willkommen/Abschied und Social-Feeds fuer The Aviary.
// Ersetzt Sapphire, siehe PLAN.md.
import { konfig, pruefeGrundkonfig } from './konfig.js';
import { api, sende, verbinde } from './discord.js';
import { twitchStream, youtubeVideos, blueskyPosts } from './feeds.js';
import { lies, setze, neueEintraege, laufzeit } from './stand.js';
import { meldeBefehleAn, beiBefehl } from './befehle.js';
import * as meldung from './meldungen.js';

const SEKUNDE = 1000;
const MINUTE = 60 * SEKUNDE;
const NEUSTART_PAUSE = 30 * MINUTE; // Stream nach Absturz neu gestartet: nicht noch mal melden

pruefeGrundkonfig();

const melde = (kanal, { inhalt, erwaehnen }) => sende(kanal, inhalt, erwaehnen);

// --- Discord-Ereignisse ---------------------------------------------------

// Nur Ereignisse vom Server, zu dem der Willkommenskanal gehoert - sollte der
// Bot noch auf anderen Servern sein, bleiben die aussen vor.
const { guild_id: server } = await api(`channels/${konfig.kanalWillkommen}`);

verbinde(async (ereignis, d) => {
  if (ereignis === 'READY') return meldeBefehleAn(d.application.id, server);
  if (d?.guild_id !== server) return;
  if (ereignis === 'INTERACTION_CREATE') return beiBefehl(d);
  if (d.user?.bot) return;
  if (ereignis === 'GUILD_MEMBER_ADD') {
    await melde(konfig.kanalWillkommen, meldung.willkommen(d.user));
    console.log(`Willkommen: ${d.user.username}`);
  } else if (ereignis === 'GUILD_MEMBER_REMOVE') {
    await melde(konfig.kanalWillkommen, meldung.abschied(d.user));
    console.log(`Abschied: ${d.user.username}`);
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
  await melde(konfig.kanalTwitch, meldung.live(stream));
  console.log(`Twitch: live gemeldet (${stream.titel})`);
}

async function pruefeYoutube() {
  for (const video of neueEintraege('youtube', await youtubeVideos())) {
    await melde(konfig.kanalYoutube, meldung.video(video));
    console.log(`YouTube: ${video.titel}`);
  }
}

async function pruefeBluesky() {
  for (const post of neueEintraege('bluesky', await blueskyPosts())) {
    await melde(konfig.kanalBluesky, meldung.post(post));
    console.log(`Bluesky: ${post.link}`);
  }
}

// Jede Quelle fuer sich: faellt eine aus, laufen die anderen weiter.
// Erfolg und Fehler landen in laufzeit, fuer /status.
function regelmaessig(name, aufgabe, abstand) {
  const q = (laufzeit.quellen[name] = {});
  const lauf = () => aufgabe().then(
    () => { q.ok = Date.now(); },
    (f) => { q.fehler = f.message; q.fehlerZeit = Date.now(); console.error(`${name}: ${f.message}`); },
  );
  lauf();
  setInterval(lauf, abstand);
}

regelmaessig('Twitch', pruefeTwitch, MINUTE);
regelmaessig('YouTube', pruefeYoutube, 5 * MINUTE);
regelmaessig('Bluesky', pruefeBluesky, 5 * MINUTE);
console.log(`Feeds aktiv: twitch.tv/${konfig.twitchKanal}, YouTube ${konfig.youtubeKanalId}, Bluesky @${konfig.blueskyHandle}`);
