// Fetches new entries from Twitch, YouTube and Bluesky. Each function returns
// a list of { id, ... }, newest first - state.js decides what is new.
import { config } from './config.js';

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

// --- Twitch ---------------------------------------------------------------

let appToken = null; // { value, expires }

async function twitchToken() {
  if (appToken && Date.now() < appToken.expires) return appToken.value;
  const d = await fetchJson('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: config.twitchClientId,
      client_secret: config.twitchClientSecret,
      grant_type: 'client_credentials',
    }),
  });
  appToken = { value: d.access_token, expires: Date.now() + (d.expires_in - 300) * 1000 };
  return appToken.value;
}

// The running stream, or null.
export async function twitchStream() {
  const url = `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(config.twitchLogin)}`;
  const query = async () => fetch(url, {
    headers: { 'Client-Id': config.twitchClientId, Authorization: `Bearer ${await twitchToken()}` },
  });
  let res = await query();
  if (res.status === 401) { appToken = null; res = await query(); }
  if (!res.ok) throw new Error(`Twitch streams: ${res.status}`);
  const [stream] = (await res.json()).data;
  if (!stream) return null;
  return { id: stream.id, title: stream.title, game: stream.game_name || 'no category', start: stream.started_at };
}

// --- YouTube --------------------------------------------------------------

const unescapeXml = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&amp;/g, '&');

export function parseYoutubeFeed(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => {
    const field = (re) => (entry.match(re) ?? [])[1] ?? '';
    const link = field(/<link rel="alternate" href="([^"]+)"/);
    return {
      id: field(/<yt:videoId>([^<]+)</),
      title: unescapeXml(field(/<title>([^<]*)</)),
      link,
      short: link.includes('/shorts/'),
    };
  }).filter((e) => e.id);
}

export async function youtubeVideos() {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${config.youtubeChannelId}`);
  if (!res.ok) throw new Error(`YouTube feed: ${res.status}`);
  return parseYoutubeFeed(await res.text());
}

// --- Bluesky --------------------------------------------------------------

export async function blueskyPosts() {
  const d = await fetchJson(
    'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed'
    + `?actor=${encodeURIComponent(config.blueskyHandle)}&filter=posts_no_replies&limit=20`,
  );
  return d.feed
    .filter((f) => !f.reason) // skip reposts of other people's posts
    .map(({ post }) => ({
      id: post.uri,
      text: post.record?.text ?? '',
      link: `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split('/').pop()}`,
    }));
}
