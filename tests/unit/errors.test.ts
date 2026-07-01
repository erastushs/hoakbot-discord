import { describe, it, expect } from 'vitest';
import { Errors } from '../../src/shared/errors/errors.js';

describe('Errors', () => {
  describe('static messages', () => {
    it('guildOnly', () => {
      expect(Errors.guildOnly()).toBe('This command can only be used inside a server.');
    });

    it('memberNotFound', () => {
      expect(Errors.memberNotFound()).toBe('User not found.');
    });

    it('warningNotFound', () => {
      expect(Errors.warningNotFound()).toBe('Warning not found.');
    });

    it('noWarnings', () => {
      expect(Errors.noWarnings()).toBe('This member has no warnings.');
    });

    it('reasonRequired', () => {
      expect(Errors.reasonRequired()).toBe('Reason is required.');
    });

    it('noReasonProvided', () => {
      expect(Errors.noReasonProvided()).toBe('No reason provided.');
    });

    it('invalidDuration', () => {
      expect(Errors.invalidDuration()).toBe(
        'Invalid duration format. Use a number followed by s, m, h, or d (e.g. 10m, 2h, 7d).',
      );
    });

    it('durationZero', () => {
      expect(Errors.durationZero()).toBe('Duration must be greater than zero.');
    });

    it('durationTooLong', () => {
      expect(Errors.durationTooLong()).toBe('Duration cannot exceed 28 days.');
    });

    it('durationRequired', () => {
      expect(Errors.durationRequired()).toBe('Please provide a duration (e.g. 10m, 2h, 7d).');
    });

    it('userRequired', () => {
      expect(Errors.userRequired()).toBe('Please specify a user.');
    });

    it('memberNotInGuild', () => {
      expect(Errors.memberNotInGuild()).toBe('That user is not a member of this server.');
    });

    it('couldNotResolveMember', () => {
      expect(Errors.couldNotResolveMember()).toBe('Could not resolve your guild member.');
    });

    it('channelNotAvailable', () => {
      expect(Errors.channelNotAvailable()).toBe('Channel not available.');
    });

    it('permissionDenied', () => {
      expect(Errors.permissionDenied()).toBe('You do not have permission to use this command.');
    });

    it('botPermissionDenied', () => {
      expect(Errors.botPermissionDenied()).toBe(
        'I do not have the required permissions to perform this action.',
      );
    });

    it('invalidAmount', () => {
      expect(Errors.invalidAmount()).toBe('Please provide a number between 1 and 100.');
    });

    it('warningIdRequired', () => {
      expect(Errors.warningIdRequired()).toBe('Please provide a warning ID.');
    });

    it('botNotAvailable', () => {
      expect(Errors.botNotAvailable()).toBe('Bot user not available.');
    });

    it('cannotBan', () => {
      expect(Errors.cannotBan()).toBe('I cannot ban this member.');
    });

    it('cannotKick', () => {
      expect(Errors.cannotKick()).toBe('I cannot kick this member.');
    });

    it('cannotTimeout', () => {
      expect(Errors.cannotTimeout()).toBe('I cannot timeout this member.');
    });

    it('failedBan', () => {
      expect(Errors.failedBan()).toBe(
        'Failed to ban the member. Check my permissions and role hierarchy.',
      );
    });

    it('failedKick', () => {
      expect(Errors.failedKick()).toBe(
        'Failed to kick the member. Check my permissions and role hierarchy.',
      );
    });

    it('failedTimeout', () => {
      expect(Errors.failedTimeout()).toBe(
        'Failed to timeout the member. Check my permissions and role hierarchy.',
      );
    });

    it('failedWarn', () => {
      expect(Errors.failedWarn()).toBe('Failed to warn the member.');
    });

    it('failedClean', () => {
      expect(Errors.failedClean()).toBe(
        'Failed to clean messages. I may not have the required permissions.',
      );
    });

    it('warningRemoved', () => {
      expect(Errors.warningRemoved()).toBe('\u{1F5D1} Warning removed.');
    });
  });

  describe('parameterized messages', () => {
    it('selfAction', () => {
      expect(Errors.selfAction('ban')).toBe('You cannot ban yourself.');
      expect(Errors.selfAction('kick')).toBe('You cannot kick yourself.');
      expect(Errors.selfAction('warn')).toBe('You cannot warn yourself.');
      expect(Errors.selfAction('timeout')).toBe('You cannot timeout yourself.');
    });

    it('botSelf', () => {
      expect(Errors.botSelf('ban')).toBe('I cannot ban myself.');
      expect(Errors.botSelf('kick')).toBe('I cannot kick myself.');
    });

    it('serverOwner', () => {
      expect(Errors.serverOwner('ban')).toBe('You cannot ban the server owner.');
      expect(Errors.serverOwner('kick')).toBe('You cannot kick the server owner.');
    });

    it('roleHierarchy', () => {
      expect(Errors.roleHierarchy('ban')).toBe(
        'You cannot ban this member due to role hierarchy.',
      );
      expect(Errors.roleHierarchy('kick')).toBe(
        'You cannot kick this member due to role hierarchy.',
      );
    });

    it('botHierarchy', () => {
      expect(Errors.botHierarchy('ban')).toBe(
        'I cannot ban this member due to role hierarchy.',
      );
      expect(Errors.botHierarchy('kick')).toBe(
        'I cannot kick this member due to role hierarchy.',
      );
    });

    it('cleanedMessages', () => {
      expect(Errors.cleanedMessages(5)).toBe('Cleaned 5 messages.');
      expect(Errors.cleanedMessages(0)).toBe('Cleaned 0 messages.');
    });

    it('warningsCleared', () => {
      expect(Errors.warningsCleared(3, 'Alice')).toBe(
        '\u{1F5D1} Cleared 3 warnings from Alice.',
      );
    });
  });
});
