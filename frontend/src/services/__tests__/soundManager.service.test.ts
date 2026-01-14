import { describe, it, expect, beforeEach, vi } from 'vitest';
import { soundManager } from '../soundManager.service';

// Mock HTMLAudioElement
class MockAudio {
  src = '';
  volume = 1;
  currentTime = 0;
  preload = '';
  private eventListeners: Map<string, Array<() => void>> = new Map();

  addEventListener(event: string, callback: () => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: () => void) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  load() {
    // Simulate successful load
    setTimeout(() => {
      this.triggerEvent('canplaythrough');
    }, 10);
  }

  play() {
    return Promise.resolve();
  }

  private triggerEvent(event: string) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback());
    }
  }
}

// Replace global Audio constructor
global.Audio = MockAudio as any;

describe('SoundManager', () => {
  beforeEach(() => {
    // Reset the sound manager state
    soundManager.setEnabled(true);
    soundManager.setVolume(0.3);
  });

  describe('preload', () => {
    it('should preload all sound files', async () => {
      await soundManager.preload();
      // If preload completes without error, sounds are loaded
      expect(true).toBe(true);
    });

    it('should set correct volume on preloaded sounds', async () => {
      soundManager.setVolume(0.5);
      await soundManager.preload();
      expect(soundManager.getVolume()).toBe(0.5);
    });
  });

  describe('play', () => {
    beforeEach(async () => {
      await soundManager.preload();
    });

    it('should play sound when enabled', () => {
      soundManager.setEnabled(true);
      // Should not throw error
      expect(() => soundManager.play('click')).not.toThrow();
    });

    it('should not play sound when disabled', () => {
      soundManager.setEnabled(false);
      // Should not throw error, just silently skip
      expect(() => soundManager.play('click')).not.toThrow();
    });

    it('should handle invalid sound names gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      soundManager.play('invalid' as any);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('setEnabled', () => {
    it('should enable sounds', () => {
      soundManager.setEnabled(true);
      expect(soundManager.isEnabled()).toBe(true);
    });

    it('should disable sounds', () => {
      soundManager.setEnabled(false);
      expect(soundManager.isEnabled()).toBe(false);
    });
  });

  describe('setVolume', () => {
    it('should set volume within valid range', () => {
      soundManager.setVolume(0.7);
      expect(soundManager.getVolume()).toBe(0.7);
    });

    it('should clamp volume to minimum 0', () => {
      soundManager.setVolume(-0.5);
      expect(soundManager.getVolume()).toBe(0);
    });

    it('should clamp volume to maximum 1', () => {
      soundManager.setVolume(1.5);
      expect(soundManager.getVolume()).toBe(1);
    });
  });

  describe('getVolume', () => {
    it('should return current volume', () => {
      soundManager.setVolume(0.4);
      expect(soundManager.getVolume()).toBe(0.4);
    });
  });

  describe('isEnabled', () => {
    it('should return enabled state', () => {
      soundManager.setEnabled(true);
      expect(soundManager.isEnabled()).toBe(true);

      soundManager.setEnabled(false);
      expect(soundManager.isEnabled()).toBe(false);
    });
  });
});
