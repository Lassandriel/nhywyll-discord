// Meldungstexte: Standard aus texte.json, von Mods per /text set geaendert.
// Die Aenderungen stehen in daten/stand.json, damit ein Update aus GitHub
// sie nicht ueberschreibt.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { wurzel } from './konfig.js';
import { lies, setze } from './stand.js';

const standard = JSON.parse(readFileSync(path.join(wurzel, 'texte.json'), 'utf8'));
delete standard._hinweis;

// Welche Platzhalter es je Text gibt - fuer /help und /text show.
export const PLATZHALTER = {
  welcome: '{user} (mention), {name}',
  leave: '{name}',
  twitch: '{title}, {game}, {link}, {ping} (live role, if set)',
  youtube: '{title}, {link}',
  youtube_short: '{title}, {link}',
  bluesky: '{link}, {text}',
};

export const ARTEN = Object.keys(PLATZHALTER);

export function text(art) {
  return lies('texte')?.[art] ?? standard[art];
}

export function istGeaendert(art) {
  return lies('texte')?.[art] != null;
}

export function setzeText(art, inhalt) {
  setze('texte', { ...lies('texte'), [art]: inhalt });
}

export function setzeZurueck(art) {
  const geaendert = { ...lies('texte') };
  delete geaendert[art];
  setze('texte', geaendert);
}

// Ersetzt {name} durch werte.name; unbekannte Platzhalter bleiben stehen.
// Leerzeichen vor einem Zeilenumbruch (etwa ein leeres {ping}) fallen weg.
export function fuelle(art, werte) {
  return text(art)
    .replace(/\{(\w+)\}/g, (ganz, name) => (name in werte ? String(werte[name]) : ganz))
    .replace(/ +\n/g, '\n')
    .trim();
}
