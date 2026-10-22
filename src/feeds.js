// Holt neue Eintraege von Twitch, YouTube und Bluesky. Jede Funktion liefert
// eine Liste { id, ... }, neueste zuerst - was davon neu ist, entscheidet
// stand.js.
import { konfig } from './konfig.js';

async function holeJson(adresse, optionen) {
  const antwort = await fetch(adresse, optionen);
  if (!antwort.ok) throw new Error(`${adresse}: ${antwort.status}`);
  return antwort.json();
}

// --- Twitch ---------------------------------------------------------------

let appToken = null; // { wert, ablauf }

async function twitchToken() {
  if (appToken && Date.now() < appToken.ablauf) return appToken.wert;
  const d = await holeJson('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: konfig.twitchClientId,
      client_secret: konfig.twitchClientSecret,
      grant_type: 'client_credentials',
    }),
  });
  appToken = { wert: d.access_token, ablauf: Date.now() + (d.expires_in - 300) * 1000 };
  return appToken.wert;
}

// Der laufende Stream oder null.
export async function twitchStream() {
  const adresse = `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(konfig.twitchKanal)}`;
  const abfrage = async () => fetch(adresse, {
    headers: { 'Client-Id': konfig.twitchClientId, Authorization: `Bearer ${await twitchToken()}` },
  });
  let antwort = await abfrage();
  if (antwort.status === 401) { appToken = null; antwort = await abfrage(); }
  if (!antwort.ok) throw new Error(`Twitch streams: ${antwort.status}`);
  const [stream] = (await antwort.json()).data;
  if (!stream) return null;
  return { id: stream.id, titel: stream.title, spiel: stream.game_name || 'no category', start: stream.started_at };
}

// --- YouTube --------------------------------------------------------------

const xmlText = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&amp;/g, '&');

export function leseYoutubeFeed(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, eintrag]) => {
    const feld = (re) => (eintrag.match(re) ?? [])[1] ?? '';
    const link = feld(/<link rel="alternate" href="([^"]+)"/);
    return {
      id: feld(/<yt:videoId>([^<]+)</),
      titel: xmlText(feld(/<title>([^<]*)</)),
      link,
      short: link.includes('/shorts/'),
    };
  }).filter((e) => e.id);
}

export async function youtubeVideos() {
  const antwort = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${konfig.youtubeKanalId}`);
  if (!antwort.ok) throw new Error(`YouTube-Feed: ${antwort.status}`);
  return leseYoutubeFeed(await antwort.text());
}

// --- Bluesky --------------------------------------------------------------

export async function blueskyPosts() {
  const d = await holeJson(
    'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed'
    + `?actor=${encodeURIComponent(konfig.blueskyHandle)}&filter=posts_no_replies&limit=20`,
  );
  return d.feed
    .filter((f) => !f.reason) // Reposts fremder Beitraege auslassen
    .map(({ post }) => ({
      id: post.uri,
      text: post.record?.text ?? '',
      link: `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split('/').pop()}`,
    }));
}
