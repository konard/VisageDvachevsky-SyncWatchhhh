import { useCallback, useEffect } from 'react';
import { soundManager, SoundName } from '@/services';
import { useSettingsStore } from '@/stores';

/**
 * Hook for playing sound effects
 *
 * Provides methods to play various UI sounds based on user settings.
 * Automatically syncs with the soundsEnabled setting from the settings store.
 *
 * @returns Object with methods to play different sounds
 */
export function useSound() {
  const soundsEnabled = useSettingsStore((state) => state.soundEffectsEnabled);

  // Sync the sound manager's enabled state with the store
  useEffect(() => {
    soundManager.setEnabled(soundsEnabled);
  }, [soundsEnabled]);

  // Create memoized play functions for each sound
  const play = useCallback((name: SoundName) => {
    soundManager.play(name);
  }, []);

  const playJoin = useCallback(() => play('join'), [play]);
  const playLeave = useCallback(() => play('leave'), [play]);
  const playMessage = useCallback(() => play('message'), [play]);
  const playClick = useCallback(() => play('click'), [play]);
  const playMicOn = useCallback(() => play('mic-on'), [play]);
  const playMicOff = useCallback(() => play('mic-off'), [play]);
  const playError = useCallback(() => play('error'), [play]);

  return {
    play,
    playJoin,
    playLeave,
    playMessage,
    playClick,
    playMicOn,
    playMicOff,
    playError,
    soundsEnabled,
  };
}
