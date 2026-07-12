import { Collection } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AvatarCommand } from '../../src/modules/general/commands/avatar.command.js';
import { BotInfoCommand } from '../../src/modules/general/commands/botinfo.command.js';
import { PingCommand } from '../../src/modules/general/commands/ping.command.js';
import { ServerInfoCommand } from '../../src/modules/general/commands/serverinfo.command.js';
import { UserInfoCommand } from '../../src/modules/general/commands/userinfo.command.js';

const logger = { warn: vi.fn() };
const avatar = 'https://cdn.discordapp.com/avatars/1/avatar.png?size=4096';

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: '123', username: 'tester', globalName: null, displayName: 'Tester', bot: false,
    avatar: null, createdAt: new Date('2020-01-02T00:00:00Z'),
    displayAvatarURL: vi.fn(() => avatar),
    client: { users: { fetch: vi.fn() }, guilds: { cache: new Collection() }, ws: { ping: 42 }, user: null },
    ...overrides,
  };
}

function context(overrides: Record<string, unknown> = {}) {
  const target = user();
  return {
    source: 'slash', user: target, member: null, guild: null, args: new Map(), logger,
    reply: vi.fn().mockResolvedValue(undefined), createdAt: new Date(), ...overrides,
  };
}

function embed(ctx: ReturnType<typeof context>) {
  return (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0][0].embeds[0].toJSON();
}

afterEach(() => vi.restoreAllMocks());

describe('general command presentation golden fixtures', () => {
  it('renders Avatar success with Unicode safely and preserves URL payload', async () => {
    const target = user({ displayName: '測試😀 @everyone', avatar: 'a_hash' });
    const ctx = context({ user: target });
    await new AvatarCommand().execute(ctx as never);
    expect(embed(ctx)).toMatchObject({
      title: "測試😀 @​everyone's Avatar",
      image: { url: avatar },
      fields: [
        { name: 'Resolution', value: '4096x4096', inline: true },
        { name: 'Animated', value: 'Yes', inline: true },
        { name: 'Direct Link', value: `[Open original](${avatar})`, inline: true },
      ],
    });
  });

  it('renders Avatar missing target failure and does not expose a fetch error', async () => {
    const actor = user();
    actor.client.users.fetch.mockRejectedValue(new Error('private token'));
    const ctx = context({ user: actor, args: new Map([['target_user_id', '404']]) });
    await new AvatarCommand().execute(ctx as never);
    expect(ctx.reply).toHaveBeenCalledWith('User not found.');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('renders User Info without guild-private fields when membership is missing', async () => {
    const target = user({ username: '@everyone😀', displayName: '@here 測試' });
    const guild = { members: { fetch: vi.fn().mockRejectedValue(new Error('denied')) } };
    const ctx = context({ user: target, guild });
    await new UserInfoCommand().execute(ctx as never);
    const json = embed(ctx);
    expect(json.title).toBe("@​here 測試's Information");
    expect(json.fields).toHaveLength(2);
    expect(json.fields[0].value).toContain('@​everyone😀');
    expect(json.fields.find((field: { name: string }) => field.name === 'Guild')).toBeUndefined();
  });

  it('renders Server Info fixture and neutralizes server-controlled mentions', async () => {
    const owner = { user: { displayName: '@everyone owner' }, displayColor: 123 };
    const members = new Collection([['1', { user: { bot: false } }], ['2', { user: { bot: true } }]]);
    const channels = new Collection([['t', { isTextBased: () => true, isVoiceBased: () => false, type: 0 }]]);
    const guild = {
      id: 'guild', name: '@here 世界', description: '@everyone description', ownerId: '1', memberCount: 2,
      createdAt: new Date('2020-01-02T00:00:00Z'), premiumTier: 1, premiumSubscriptionCount: 2,
      fetchOwner: vi.fn().mockResolvedValue(owner), members: { fetch: vi.fn(), cache: members },
      channels: { cache: channels }, roles: { cache: new Collection([['r', {}]]) },
      emojis: { cache: new Collection() }, stickers: { cache: new Collection() },
      iconURL: () => null, bannerURL: () => null,
    };
    const ctx = context({ guild });
    await new ServerInfoCommand().execute(ctx as never);
    const json = embed(ctx);
    expect(json.title).toBe('🏠 @​here 世界');
    expect(json.description).toBe('@​everyone description\n`guild`');
    expect(json.fields[0].value).toContain('@​everyone owner');
    expect(json.fields[1].value).toContain('**Humans**  1');
  });

  it.each([
    ['empty context', null, 'This command can only be used inside a server.'],
    ['fetch failure', { fetchOwner: vi.fn().mockRejectedValue(new Error('denied')), members: { fetch: vi.fn() } }, 'Server information is currently unavailable.'],
  ])('renders Server Info %s', async (_name, guild, expected) => {
    const ctx = context({ guild });
    await new ServerInfoCommand().execute(ctx as never);
    expect(ctx.reply).toHaveBeenCalledWith(expected);
  });

  it('renders Bot Info unavailable without changing visibility', async () => {
    const actor = user();
    const ctx = context({ user: actor });
    await new BotInfoCommand({} as never).execute(ctx as never);
    expect(ctx.reply).toHaveBeenCalledWith('Bot user not available.');
  });

  it('preserves Ping request-latency semantics and clamps future timestamps', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(10_000);
    const normal = context({ createdAt: new Date(9_877) });
    await new PingCommand().execute(normal as never);
    expect(normal.reply).toHaveBeenCalledWith('Pong! `123ms`');
    const future = context({ createdAt: new Date(11_000) });
    await new PingCommand().execute(future as never);
    expect(future.reply).toHaveBeenCalledWith('Pong! `0ms`');
  });
});
