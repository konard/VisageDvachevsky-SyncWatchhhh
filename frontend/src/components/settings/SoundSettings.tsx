import { Volume2, VolumeX } from 'lucide-react';
import { GlassToggle } from '@/components/ui/glass';
import { useSettingsStore } from '@/stores';
import { useSound } from '@/hooks';

/**
 * Sound Settings Component
 *
 * Provides a toggle to enable/disable sound effects globally.
 * Persists the preference in localStorage via the settings store.
 */
export function SoundSettings() {
  const soundsEnabled = useSettingsStore((state) => state.soundEffectsEnabled);
  const setSoundsEnabled = useSettingsStore((state) => state.setSoundEffectsEnabled);
  const { playClick } = useSound();

  const handleToggle = (checked: boolean) => {
    setSoundsEnabled(checked);
    // Play a test sound when enabling
    if (checked) {
      // Small delay to ensure the sound manager is enabled
      setTimeout(() => playClick(), 50);
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
      {soundsEnabled ? (
        <Volume2 className="w-5 h-5 text-accent-cyan" />
      ) : (
        <VolumeX className="w-5 h-5 text-gray-400" />
      )}
      <GlassToggle
        checked={soundsEnabled}
        onChange={handleToggle}
        label="Sound Effects"
        description="Play sounds for UI feedback"
        className="flex-1"
      />
    </div>
  );
}
