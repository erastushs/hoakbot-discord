import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  type AudioPlayer,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import type { VoiceConnection } from '@discordjs/voice';
import type { ILogger } from '../../../core/logger/logger.service.js';

export class AudioManager {
  private readonly players = new Set<AudioPlayer>();
  private readonly cancellations = new Set<() => void>();

  constructor(private readonly logger: ILogger) {}

  stop(): void {
    for (const cancel of this.cancellations) cancel();
    this.cancellations.clear();
    for (const player of this.players) player.stop(true);
    this.players.clear();
  }

  async play(connection: VoiceConnection | null, soundFile: string, volume: number): Promise<void> {
    if (!connection) {
      this.logger.error({ reason: 'No voice connection' }, 'Cannot play audio');
      return;
    }

    const connectionState = connection.state.status;
    this.logger.info({ soundFile, volume, connectionState }, 'Starting audio playback');

    if (connectionState !== VoiceConnectionStatus.Ready) {
      await this.waitForReady(connection);
    }

    const player: AudioPlayer = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });
    this.players.add(player);

    try {
      const resource = createAudioResource(soundFile, { inlineVolume: true });
      if (resource.volume) {
        resource.volume.setVolume(volume);
      }

      player.play(resource);
      connection.subscribe(player);

      await this.waitForPlayback(player);
      this.logger.info({ soundFile }, 'Audio playback completed');
    } catch (err) {
      const errorDetail = err instanceof Error ? { message: err.message, stack: err.stack } : { error: String(err) };
      this.logger.error({ ...errorDetail, soundFile, connectionState }, 'Audio playback failed');
      throw err;
    } finally {
      this.players.delete(player);
      player.stop(true);
    }
  }

  private waitForReady(connection: VoiceConnection): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        connection.off(VoiceConnectionStatus.Ready, finish);
        this.cancellations.delete(finish);
        resolve();
      };
      const timeout = setTimeout(() => {
        this.logger.warn('Timed out waiting for voice connection ready');
        finish();
      }, 10000);
      this.cancellations.add(finish);
      connection.once(VoiceConnectionStatus.Ready, finish);
    });
  }

  private waitForPlayback(player: AudioPlayer): Promise<void> {
    return new Promise((resolve, reject) => {
      player.once(AudioPlayerStatus.Idle, () => {
        resolve();
      });

      player.once('error', (error: Error) => {
        this.logger.error(
          {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          'Audio player error',
        );
        reject(error);
      });
    });
  }
}
