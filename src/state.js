// What the bot has already announced, so a restart neither repeats
// announcements nor posts everything at once.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './config.js';

// Folder and file names stay as deployed (the systemd unit allows writes to daten/).
const folder = path.join(root, 'daten');
const file = path.join(folder, 'stand.json');
const KEEP = 50; // IDs kept per feed - the sources never return more at once

const state = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};

function save() {
  mkdirSync(folder, { recursive: true });
  const temp = `${file}.tmp.${process.pid}`;
  writeFileSync(temp, JSON.stringify(state, null, 2));
  renameSync(temp, file);
}

export function get(key) {
  return state[key];
}

export function set(key, value) {
  state[key] = value;
  save();
}

// Returns the entries not seen before (oldest first) and remembers them.
// On a feed's very first run: remember everything, announce nothing.
export function newEntries(feed, entries) {
  const seen = state[feed];
  const ids = entries.map((e) => e.id);
  if (!seen) {
    set(feed, ids.slice(0, KEEP));
    return [];
  }
  const fresh = entries.filter((e) => !seen.includes(e.id));
  if (fresh.length) set(feed, [...fresh.map((e) => e.id), ...seen].slice(0, KEEP));
  return fresh.reverse();
}

// In memory only: when each source last worked and its last error.
// For /status, so mods can see whether a feed is stuck.
export const runtime = { start: Date.now(), sources: {} };
