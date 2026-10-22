import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const envFile = path.join(root, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const env = (name, fallback = '') => (process.env[name] ?? fallback).trim();

// The .env variable names stay German - they already exist on CT 103.
export const config = {
  discordToken: env('DISCORD_TOKEN'),
  welcomeChannel: env('DISCORD_KANAL_WILLKOMMEN'),
  // All feeds go to the same channel unless one has its own.
  twitchChannel: env('DISCORD_KANAL_TWITCH') || env('DISCORD_KANAL_FEEDS'),
  youtubeChannel: env('DISCORD_KANAL_YOUTUBE') || env('DISCORD_KANAL_FEEDS'),
  blueskyChannel: env('DISCORD_KANAL_BLUESKY') || env('DISCORD_KANAL_FEEDS'),
  // Optional: roles pinged by the matching announcement
  // (on The Aviary: twitchnotif, youtubenotif, blsknotif).
  liveRole: env('DISCORD_ROLLE_LIVE'),
  youtubeRole: env('DISCORD_ROLLE_YOUTUBE'),
  blueskyRole: env('DISCORD_ROLLE_BLUESKY'),
  // Where /test sends its samples (the mod channel #notepad).
  // Empty: the channel /test was used in.
  testChannel: env('DISCORD_KANAL_TEST'),

  twitchClientId: env('TWITCH_CLIENT_ID'),
  twitchClientSecret: env('TWITCH_CLIENT_SECRET'),
  twitchLogin: env('TWITCH_KANAL', 'nhywyll').toLowerCase(),
  youtubeChannelId: env('YOUTUBE_KANAL_ID', 'UCtiQlpGmReXnpVsuhRxdc3A'),
  blueskyHandle: env('BLUESKY_HANDLE', 'nhywyll.com'),
};

export function checkConfig() {
  const missing = [];
  if (!config.discordToken) missing.push('DISCORD_TOKEN');
  if (!config.welcomeChannel) missing.push('DISCORD_KANAL_WILLKOMMEN');
  if (!config.twitchChannel || !config.youtubeChannel || !config.blueskyChannel) missing.push('DISCORD_KANAL_FEEDS');
  if (!config.twitchClientId) missing.push('TWITCH_CLIENT_ID');
  if (!config.twitchClientSecret) missing.push('TWITCH_CLIENT_SECRET');
  if (missing.length) {
    console.error(`In der .env fehlt: ${missing.join(', ')}`);
    console.error('Vorlage steht in .env-template.');
    process.exit(1);
  }
}
