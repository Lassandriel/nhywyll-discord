// Slash commands for mods: /help, /test, /text, /status. Visible only to
// people with "Manage Server"; Server Settings -> Integrations -> Bird Keeper
// can extend that to a mod role.
import { config } from './config.js';
import { api, send } from './discord.js';
import { twitchStream, youtubeVideos, blueskyPosts } from './feeds.js';
import { KINDS, PLACEHOLDERS, text, isChanged, setText, resetText } from './texts.js';
import { runtime } from './state.js';
import * as message from './messages.js';

const MANAGE_GUILD = String(1 << 5);
const EPHEMERAL = 64; // only the person who used the command sees the reply

const kindOption = {
  name: 'type', description: 'Which message', type: 3, required: true,
  choices: KINDS.map((k) => ({ name: k, value: k })),
};

const COMMANDS = [
  { name: 'help', description: 'What Bird Keeper does and how to change it' },
  {
    name: 'test', description: 'Post a sample message to the mod test channel (no pings)',
    options: [kindOption],
  },
  {
    name: 'text', description: 'Show or change the message texts',
    options: [
      { name: 'show', description: 'Show all texts and their placeholders', type: 1 },
      {
        name: 'set', description: 'Change a text (use \\n for a line break)', type: 1,
        options: [kindOption, { name: 'text', description: 'New text', type: 3, required: true, max_length: 1500 }],
      },
      { name: 'reset', description: 'Back to the default text', type: 1, options: [kindOption] },
    ],
  },
  { name: 'status', description: 'Are the feeds working? When did they last check?' },
].map((c) => ({ ...c, default_member_permissions: MANAGE_GUILD, contexts: [0] }));

// Registers the commands with the server. Overwrites the whole set each
// time, so removed commands disappear from Discord too.
export async function registerCommands(applicationId, guildId) {
  await api(`applications/${applicationId}/guilds/${guildId}/commands`, {
    method: 'PUT', body: JSON.stringify(COMMANDS),
  });
  console.log(`Slash-Befehle angemeldet: ${COMMANDS.map((c) => `/${c.name}`).join(' ')}`);
}

const reply = (i, content) => api(`interactions/${i.id}/${i.token}/callback`, {
  method: 'POST',
  body: JSON.stringify({ type: 4, data: { content: content.slice(0, 2000), flags: EPHEMERAL, allowed_mentions: { parse: [] } } }),
});

// For commands that may take longer than the 3 s Discord allows for a
// reply: answer "thinking..." first, then follow up.
const defer = (i) => api(`interactions/${i.id}/${i.token}/callback`, {
  method: 'POST', body: JSON.stringify({ type: 5, data: { flags: EPHEMERAL } }),
});
const followUp = (i, content) => api(`webhooks/${i.application_id}/${i.token}/messages/@original`, {
  method: 'PATCH', body: JSON.stringify({ content: content.slice(0, 2000), allowed_mentions: { parse: [] } }),
});

const ago = (time) => {
  if (!time) return 'never';
  const s = Math.round((Date.now() - time) / 1000);
  return s < 120 ? `${s} s ago` : s < 7200 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`;
};

const HELP = `**Bird Keeper** - welcome/leave messages and social feeds for The Aviary.

**What it posts on its own**
- Welcome and leave messages in <#${config.welcomeChannel}>
- Twitch live in <#${config.twitchChannel}> (checked every minute)
- New YouTube videos and Shorts in <#${config.youtubeChannel}> (every 5 min)
- New Bluesky posts in <#${config.blueskyChannel}> (every 5 min)

**Commands** (only visible to mods)
\`/test type\` - post a sample of a message${config.testChannel ? ` to <#${config.testChannel}>` : ' here'}, nobody gets pinged
\`/text show\` - show all texts and their placeholders
\`/text set type text\` - change a text, \`\\n\` makes a new line
\`/text reset type\` - back to the default text
\`/status\` - when each feed last worked, and the last error

Texts are changed right away, no restart needed. Placeholders like \`{title}\` are filled in by the bot.`;

async function sample(kind, user) {
  switch (kind) {
    case 'welcome': return message.welcome(user);
    case 'leave': return message.leave(user);
    case 'twitch':
      return message.live(await twitchStream() ?? { title: 'Sample stream title', game: 'Minecraft' });
    case 'youtube':
    case 'youtube_short': {
      const videos = await youtubeVideos();
      const match = videos.find((v) => v.short === (kind === 'youtube_short')) ?? videos[0];
      return message.video({ ...match, short: kind === 'youtube_short' });
    }
    case 'bluesky': return message.post((await blueskyPosts())[0]);
  }
}

// Called for every INTERACTION_CREATE.
export async function onCommand(i) {
  if (i.type !== 2) return; // slash commands only
  const user = i.member?.user ?? i.user;
  const sub = i.data.options?.[0];
  const value = (name, options = i.data.options) => options?.find((o) => o.name === name)?.value;
  console.log(`/${i.data.name}${sub?.type === 1 ? ` ${sub.name}` : ''} von ${user.username}`);

  switch (i.data.name) {
    case 'help':
      return reply(i, HELP);

    case 'test': {
      const kind = value('type');
      const target = config.testChannel || i.channel_id;
      await defer(i);
      try {
        const { content } = await sample(kind, user);
        // No mentions passed: a test never pings anyone.
        await send(target, `🧪 **Test: ${kind}**\n${content}`);
        return followUp(i, `Sample sent to <#${target}>.`);
      } catch (err) {
        return followUp(i, `Test failed: \`${err.message.slice(0, 300)}\``);
      }
    }

    case 'text': {
      if (sub.name === 'show') {
        const lines = KINDS.map((k) => `**${k}**${isChanged(k) ? ' (changed)' : ''} - placeholders: ${PLACEHOLDERS[k]}\n\`\`\`\n${text(k)}\n\`\`\``);
        return reply(i, lines.join('\n'));
      }
      const kind = value('type', sub.options);
      if (sub.name === 'reset') {
        resetText(kind);
        return reply(i, `**${kind}** is back to the default:\n\`\`\`\n${text(kind)}\n\`\`\``);
      }
      setText(kind, value('text', sub.options).replace(/\\n/g, '\n'));
      return reply(i, `**${kind}** changed. Try it with \`/test type:${kind}\`.\n\`\`\`\n${text(kind)}\n\`\`\``);
    }

    case 'status': {
      const lines = Object.entries(runtime.sources).map(([name, src]) =>
        `**${name}**: last OK ${ago(src.ok)}${src.error ? ` - last error ${ago(src.errorTime)}: \`${src.error.slice(0, 150)}\`` : ''}`);
      return reply(i, `Started ${ago(runtime.start)}.\n${lines.join('\n')}`);
    }
  }
}
