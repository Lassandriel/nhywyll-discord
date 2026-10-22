// Message texts: defaults from texts.json, changed by mods via /text set.
// Mod changes live in daten/stand.json so an update from GitHub never
// overwrites them.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './config.js';
import { get, set } from './state.js';

const defaults = JSON.parse(readFileSync(path.join(root, 'texts.json'), 'utf8'));
delete defaults._note;

// Placeholders per text - shown by /help and /text show.
export const PLACEHOLDERS = {
  welcome: '{user} (mention), {name}',
  leave: '{name}',
  twitch: '{title}, {game}, {link}, {ping} (twitchnotif role)',
  youtube: '{title}, {link}, {ping} (youtubenotif role)',
  youtube_short: '{title}, {link}, {ping} (youtubenotif role)',
  bluesky: '{link}, {text}, {ping} (blsknotif role)',
};

export const KINDS = Object.keys(PLACEHOLDERS);

// Stored under the key 'texte' (German) since the first deploy - keep it.
const overrides = () => get('texte') ?? {};

export function text(kind) {
  return overrides()[kind] ?? defaults[kind];
}

export function isChanged(kind) {
  return overrides()[kind] != null;
}

export function setText(kind, content) {
  set('texte', { ...overrides(), [kind]: content });
}

export function resetText(kind) {
  const changed = { ...overrides() };
  delete changed[kind];
  set('texte', changed);
}

// Replaces {name} with values.name; unknown placeholders stay as they are.
// Spaces before a line break (e.g. an empty {ping}) are dropped.
export function fill(kind, values) {
  return text(kind)
    .replace(/\{(\w+)\}/g, (whole, name) => (name in values ? String(values[name]) : whole))
    .replace(/ +\n/g, '\n')
    .trim();
}
