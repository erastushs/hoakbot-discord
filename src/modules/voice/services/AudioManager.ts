import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  type AudioPlayer,
} from '@discordjs/voice';
import type { VoiceConnection } from '@discordjs/voice';
import type { ILogger } from '../../../core/logger/logger.service.js';

export class AudioManager {
  constructor(private readonly logger: ILogger) {}

  async play(connection: VoiceConnection | null, soundFile: string, volume: number): Promise<void> {
    if (!connection) {
      this.logger.error('Cannot play audio — no voice connection');
      return;
    }

    this.logger.info({ soundFile, volume }, 'Starting audio playback');

    const player: AudioPlayer = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });

    const resource = createAudioResource(soundFile, { inlineVolume: true });
    resource.volume?.setVolume(volume);

    player.play(resource);
    connection.subscribe(player);

    await this.waitForPlayback(player);

    player.stop();
    this.logger.info('Audio playback completed');
  }

  private waitForPlayback(player: AudioPlayer): Promise<void> {
    return new Promise((resolve, reject) => {
      player.once(AudioPlayerStatus.Idle, () => {
        resolve();
      });

      player.once('error', (error: Error) => {
        this.logger.error({ error }, 'Audio playback failed');
        reject(error);
      });
    });
  }
}
