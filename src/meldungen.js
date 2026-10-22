// Baut die fertigen Meldungen aus Text und Daten - fuer den echten Betrieb
// und fuer /test gleichermassen. Rueckgabe: { inhalt, erwaehnen }.
import { konfig } from './konfig.js';
import { fuelle } from './texte.js';

const anzeigename = (user) => user.global_name || user.username;

// {ping} im Text und die Erlaubnis, genau diese Rolle anzupingen.
const pingFuer = (rolle) => ({
  ping: rolle ? `<@&${rolle}>` : '',
  erwaehnen: { rollen: rolle ? [rolle] : [] },
});

export const willkommen = (user) => ({
  inhalt: fuelle('welcome', { user: `<@${user.id}>`, name: anzeigename(user) }),
  erwaehnen: { nutzer: [user.id] },
});

export const abschied = (user) => ({
  inhalt: fuelle('leave', { name: anzeigename(user) }),
});

export function live(stream) {
  const { ping, erwaehnen } = pingFuer(konfig.rolleLive);
  return {
    inhalt: fuelle('twitch', {
      title: stream.titel, game: stream.spiel, link: `https://twitch.tv/${konfig.twitchKanal}`, ping,
    }),
    erwaehnen,
  };
}

export function video(v) {
  const { ping, erwaehnen } = pingFuer(konfig.rolleYoutube);
  return { inhalt: fuelle(v.short ? 'youtube_short' : 'youtube', { title: v.titel, link: v.link, ping }), erwaehnen };
}

export function post(p) {
  const { ping, erwaehnen } = pingFuer(konfig.rolleBluesky);
  return { inhalt: fuelle('bluesky', { link: p.link, text: p.text, ping }), erwaehnen };
}
