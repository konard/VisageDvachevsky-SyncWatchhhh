/**
 * Sound Manager Service
 *
 * Manages audio playback for UI feedback with user control.
 * Preloads sounds on initialization and provides methods to play them.
 */

export type SoundName =
  | 'join'
  | 'leave'
  | 'message'
  | 'click'
  | 'mic-on'
  | 'mic-off'
  | 'error';

/**
 * SoundManager class handles preloading and playing sound effects
 */
class SoundManager {
  private sounds: Map<SoundName, HTMLAudioElement>;
  private enabled: boolean;
  private volume: number;

  constructor() {
    this.sounds = new Map();
    this.enabled = true;
    this.volume = 0.3;
  }

  /**
   * Preload all sound files
   * Should be called on app initialization
   */
  async preload(): Promise<void> {
    const soundFiles: SoundName[] = [
      'join',
      'leave',
      'message',
      'click',
      'mic-on',
      'mic-off',
      'error',
    ];

    const loadPromises = soundFiles.map((name) => {
      return new Promise<void>((resolve) => {
        const audio = new Audio(`/sounds/${name}.mp3`);
        audio.volume = this.volume;
        audio.preload = 'auto';

        // Handle load events
        audio.addEventListener('canplaythrough', () => {
          this.sounds.set(name, audio);
          resolve();
        }, { once: true });

        // Handle errors gracefully
        audio.addEventListener('error', () => {
          console.warn(`Failed to load sound: ${name}`);
          resolve(); // Resolve anyway to not block initialization
        }, { once: true });

        // Start loading
        audio.load();
      });
    });

    await Promise.all(loadPromises);
  }

  /**
   * Play a sound by name
   * @param name - The name of the sound to play
   */
  play(name: SoundName): void {
    if (!this.enabled) return;

    const sound = this.sounds.get(name);
    if (!sound) {
      console.warn(`Sound not found: ${name}`);
      return;
    }

    // Reset playback position for rapid repeated plays
    sound.currentTime = 0;

    // Play and catch autoplay errors silently
    sound.play().catch((error) => {
      // Ignore autoplay policy errors
      if (error.name !== 'NotAllowedError') {
        console.warn(`Error playing sound ${name}:`, error);
      }
    });
  }

  /**
   * Enable or disable sound effects globally
   * @param enabled - Whether sounds should be enabled
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if sounds are currently enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set the global volume for all sounds
   * @param volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));

    // Update volume for all loaded sounds
    this.sounds.forEach((audio) => {
      audio.volume = this.volume;
    });
  }

  /**
   * Get the current volume level
   */
  getVolume(): number {
    return this.volume;
  }
}

// Export a singleton instance
export const soundManager = new SoundManager();
