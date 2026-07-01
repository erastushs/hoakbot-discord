export const Errors = {
  guildOnly: (): string => 'This command can only be used inside a server.',
  memberNotFound: (): string => 'User not found.',
  warningNotFound: (): string => 'Warning not found.',
  noWarnings: (): string => 'This member has no warnings.',
  reasonRequired: (): string => 'Reason is required.',
  noReasonProvided: (): string => 'No reason provided.',

  invalidDuration: (): string =>
    'Invalid duration format. Use a number followed by s, m, h, or d (e.g. 10m, 2h, 7d).',
  durationZero: (): string => 'Duration must be greater than zero.',
  durationTooLong: (): string => 'Duration cannot exceed 28 days.',
  durationRequired: (): string => 'Please provide a duration (e.g. 10m, 2h, 7d).',

  userRequired: (): string => 'Please specify a user.',
  memberNotInGuild: (): string => 'That user is not a member of this server.',
  couldNotResolveMember: (): string => 'Could not resolve your guild member.',
  channelNotAvailable: (): string => 'Channel not available.',

  permissionDenied: (): string => 'You do not have permission to use this command.',
  botPermissionDenied: (): string => 'I do not have the required permissions to perform this action.',
  invalidAmount: (): string => 'Please provide a number between 1 and 100.',
  warningIdRequired: (): string => 'Please provide a warning ID.',
  botNotAvailable: (): string => 'Bot user not available.',

  cannotBan: (): string => 'I cannot ban this member.',
  cannotKick: (): string => 'I cannot kick this member.',
  cannotTimeout: (): string => 'I cannot timeout this member.',

  selfAction: (action: string): string => `You cannot ${action} yourself.`,
  botSelf: (action: string): string => `I cannot ${action} myself.`,
  serverOwner: (action: string): string => `You cannot ${action} the server owner.`,
  roleHierarchy: (action: string): string => `You cannot ${action} this member due to role hierarchy.`,
  botHierarchy: (action: string): string => `I cannot ${action} this member due to role hierarchy.`,

  failedBan: (): string => 'Failed to ban the member. Check my permissions and role hierarchy.',
  failedKick: (): string => 'Failed to kick the member. Check my permissions and role hierarchy.',
  failedTimeout: (): string => 'Failed to timeout the member. Check my permissions and role hierarchy.',
  failedWarn: (): string => 'Failed to warn the member.',
  failedClean: (): string =>
    'Failed to clean messages. I may not have the required permissions.',

  cleanedMessages: (count: number): string => `Cleaned ${count} messages.`,
  warningsCleared: (count: number, name: string): string =>
    `\u{1F5D1} Cleared ${count} warnings from ${name}.`,
  warningRemoved: (): string => '\u{1F5D1} Warning removed.',
};
