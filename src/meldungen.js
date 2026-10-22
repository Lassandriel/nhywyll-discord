// Baut die fertigen Meldungen aus Text und Daten - fuer den echten Betrieb
// und fuer /test gleichermassen. Rueckgabe: { inhalt, erwaehnen }.
import { konfig } from './konfig.js';
import { fuelle } from './texte.js';

const anzeigename = (user) => user.global_name || user.username;

export const willkommen = (user) => ({
  inhalt: fuelle('welcome', { user: `<@${user.id}>`, name: anzeigename(user) }),
  erwaehnen: { nutzer: [user.id] },
});

export const abschied = (user) => ({
  inhalt: fuelle('leave', { name: anzeigename(user) }),
});

export const live = (stream) => ({
  inhalt: fuelle('twitch', {
    title: stream.titel,
    game: stream.spiel,
    link: `https://twitch.tv/${konfig.twitchKanal}`,
    ping: konfig.rolleLive ? `<@&${konfig.rolleLive}>` : '',
  }),
  erwaehnen: { rollen: konfig.rolleLive ? [konfig.rolleLive] : [] },
});

export const video = (v) => ({
  inhalt: fuelle(v.short ? 'youtube_short' : 'youtube', { title: v.titel, link: v.link }),
});

export const post = (p) => ({
  inhalt: fuelle('bluesky', { link: p.link, text: p.text }),
});
