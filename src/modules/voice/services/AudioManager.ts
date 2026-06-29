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
  constructor(private readonly logger: ILogger) {}

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
      player.stop(true);
    }
  }

  private waitForReady(connection: VoiceConnection): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.logger.warn('Timed out waiting for voice connection ready');
        resolve();
      }, 10000);

      connection.once(VoiceConnectionStatus.Ready, () => {
        clearTimeout(timeout);
        resolve();
      });
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
