// Was der Bot schon gemeldet hat, damit nach einem Neustart nichts doppelt
// oder alles auf einmal kommt.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { wurzel } from './konfig.js';

const ordner = path.join(wurzel, 'daten');
const datei = path.join(ordner, 'stand.json');
const MERKEN = 50; // je Feed so viele IDs behalten - mehr liefern die Quellen nie auf einmal

let stand = existsSync(datei) ? JSON.parse(readFileSync(datei, 'utf8')) : {};

function sichern() {
  mkdirSync(ordner, { recursive: true });
  const zwischen = `${datei}.tmp.${process.pid}`;
  writeFileSync(zwischen, JSON.stringify(stand, null, 2));
  renameSync(zwischen, datei);
}

export function lies(schluessel) {
  return stand[schluessel];
}

export function setze(schluessel, wert) {
  stand[schluessel] = wert;
  sichern();
}

// Gibt die noch nicht gesehenen Eintraege zurueck (aelteste zuerst) und
// merkt sie sich. Beim ersten Lauf eines Feeds: alles merken, nichts melden.
export function neueEintraege(feed, eintraege) {
  const gesehen = stand[feed];
  const ids = eintraege.map((e) => e.id);
  if (!gesehen) {
    setze(feed, ids.slice(0, MERKEN));
    return [];
  }
  const neu = eintraege.filter((e) => !gesehen.includes(e.id));
  if (neu.length) setze(feed, [...neu.map((e) => e.id), ...gesehen].slice(0, MERKEN));
  return neu.reverse();
}

// Nur im Speicher: wann jede Quelle zuletzt geklappt hat und der letzte
// Fehler. Fuer /status, damit Mods sehen, ob ein Feed haengt.
export const laufzeit = { start: Date.now(), quellen: {} };
