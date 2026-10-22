// Nhywyll Discord bot: welcome/leave messages and social feeds for The Aviary.
// Replaces Sapphire, see PLAN.md.
import { config, checkConfig } from './config.js';
import { api, send, connect } from './discord.js';
import { twitchStream, youtubeVideos, blueskyPosts } from './feeds.js';
import { get, set, newEntries, runtime } from './state.js';
import { registerCommands, onCommand } from './commands.js';
import * as message from './messages.js';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const RESTART_GRACE = 30 * MINUTE; // stream restarted after a crash: don't announce again

checkConfig();

const post = (channel, { content, mentions }) => send(channel, content, mentions);

// --- Discord events -------------------------------------------------------

// Only events from the server the welcome channel belongs to - should the
// bot ever be on other servers, those are ignored.
const { guild_id: guildId } = await api(`channels/${config.welcomeChannel}`);

connect(async (event, d) => {
  if (event === 'READY') return registerCommands(d.application.id, guildId);
  if (d?.guild_id !== guildId) return;
  if (event === 'INTERACTION_CREATE') return onCommand(d);
  if (d.user?.bot) return;
  if (event === 'GUILD_MEMBER_ADD') {
    await post(config.welcomeChannel, message.welcome(d.user));
    console.log(`Willkommen: ${d.user.username}`);
  } else if (event === 'GUILD_MEMBER_REMOVE') {
    await post(config.welcomeChannel, message.leave(d.user));
    console.log(`Abschied: ${d.user.username}`);
  }
});

// --- Feeds ----------------------------------------------------------------

async function checkTwitch() {
  const stream = await twitchStream();
  if (!stream) return;
  const last = get('twitch') ?? {};
  if (last.id === stream.id) return;
  set('twitch', { id: stream.id, zeit: Date.now() }); // 'zeit' kept: stored data
  if (last.zeit && Date.now() - last.zeit < RESTART_GRACE) {
    console.log(`Twitch: neuer Stream ${stream.id} kurz nach dem letzten, keine zweite Meldung`);
    return;
  }
  await post(config.twitchChannel, message.live(stream));
  console.log(`Twitch: live gemeldet (${stream.title})`);
}

async function checkYoutube() {
  for (const video of newEntries('youtube', await youtubeVideos())) {
    await post(config.youtubeChannel, message.video(video));
    console.log(`YouTube: ${video.title}`);
  }
}

async function checkBluesky() {
  for (const p of newEntries('bluesky', await blueskyPosts())) {
    await post(config.blueskyChannel, message.post(p));
    console.log(`Bluesky: ${p.link}`);
  }
}

// Each source on its own: if one fails, the others keep running.
// Success and errors go into runtime, for /status.
function every(name, task, interval) {
  const src = (runtime.sources[name] = {});
  const run = () => task().then(
    () => { src.ok = Date.now(); },
    (err) => { src.error = err.message; src.errorTime = Date.now(); console.error(`${name}: ${err.message}`); },
  );
  run();
  setInterval(run, interval);
}

every('Twitch', checkTwitch, MINUTE);
every('YouTube', checkYoutube, 5 * MINUTE);
every('Bluesky', checkBluesky, 5 * MINUTE);
console.log(`Feeds aktiv: twitch.tv/${config.twitchLogin}, YouTube ${config.youtubeChannelId}, Bluesky @${config.blueskyHandle}`);
