// Builds the finished messages from text and data - for normal operation
// and for /test alike. Returns { content, mentions }.
import { config } from './config.js';
import { fill } from './texts.js';

const displayName = (user) => user.global_name || user.username;

// {ping} for the text, plus permission to ping exactly that role.
const pingFor = (role) => ({
  ping: role ? `<@&${role}>` : '',
  mentions: { roles: role ? [role] : [] },
});

export const welcome = (user) => ({
  content: fill('welcome', { user: `<@${user.id}>`, name: displayName(user) }),
  mentions: { users: [user.id] },
});

export const leave = (user) => ({
  content: fill('leave', { name: displayName(user) }),
});

export function live(stream) {
  const { ping, mentions } = pingFor(config.liveRole);
  return {
    content: fill('twitch', {
      title: stream.title, game: stream.game, link: `https://twitch.tv/${config.twitchLogin}`, ping,
    }),
    mentions,
  };
}

export function video(v) {
  const { ping, mentions } = pingFor(config.youtubeRole);
  return { content: fill(v.short ? 'youtube_short' : 'youtube', { title: v.title, link: v.link, ping }), mentions };
}

export function post(p) {
  const { ping, mentions } = pingFor(config.blueskyRole);
  return { content: fill('bluesky', { link: p.link, text: p.text, ping }), mentions };
}
