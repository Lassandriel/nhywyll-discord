import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const envDatei = path.join(wurzel, '.env');
if (existsSync(envDatei)) process.loadEnvFile(envDatei);

const env = (name, vorgabe = '') => (process.env[name] ?? vorgabe).trim();

export const konfig = {
  discordToken: env('DISCORD_TOKEN'),
  kanalWillkommen: env('DISCORD_KANAL_WILLKOMMEN'),
  // Alle Feeds landen im selben Kanal, ausser es ist einer eigens gesetzt.
  kanalTwitch: env('DISCORD_KANAL_TWITCH') || env('DISCORD_KANAL_FEEDS'),
  kanalYoutube: env('DISCORD_KANAL_YOUTUBE') || env('DISCORD_KANAL_FEEDS'),
  kanalBluesky: env('DISCORD_KANAL_BLUESKY') || env('DISCORD_KANAL_FEEDS'),
  // Optional: diese Rolle wird bei der Live-Meldung angepingt.
  rolleLive: env('DISCORD_ROLLE_LIVE'),
  // Hierhin schickt /test seine Probemeldungen (der Mod-Kanal #notepad).
  // Leer: in den Kanal, in dem /test benutzt wurde.
  kanalTest: env('DISCORD_KANAL_TEST'),

  twitchClientId: env('TWITCH_CLIENT_ID'),
  twitchClientSecret: env('TWITCH_CLIENT_SECRET'),
  twitchKanal: env('TWITCH_KANAL', 'nhywyll').toLowerCase(),
  youtubeKanalId: env('YOUTUBE_KANAL_ID', 'UCtiQlpGmReXnpVsuhRxdc3A'),
  blueskyHandle: env('BLUESKY_HANDLE', 'nhywyll.com'),
};

export function pruefeGrundkonfig() {
  const fehlt = [];
  if (!konfig.discordToken) fehlt.push('DISCORD_TOKEN');
  if (!konfig.kanalWillkommen) fehlt.push('DISCORD_KANAL_WILLKOMMEN');
  if (!konfig.kanalTwitch || !konfig.kanalYoutube || !konfig.kanalBluesky) fehlt.push('DISCORD_KANAL_FEEDS');
  if (!konfig.twitchClientId) fehlt.push('TWITCH_CLIENT_ID');
  if (!konfig.twitchClientSecret) fehlt.push('TWITCH_CLIENT_SECRET');
  if (fehlt.length) {
    console.error(`In der .env fehlt: ${fehlt.join(', ')}`);
    console.error('Vorlage steht in .env-template.');
    process.exit(1);
  }
}
