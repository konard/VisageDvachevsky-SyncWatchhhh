import { GlassButton } from './ui/glass';
import { useSound } from '@/hooks';

/**
 * Sound Effects Demo Component
 *
 * Demonstrates all available sound effects with test buttons.
 * Useful for testing and showcasing the sound system.
 */
export function SoundEffectsDemo() {
  const {
    playJoin,
    playLeave,
    playMessage,
    playClick,
    playMicOn,
    playMicOff,
    playError,
    soundsEnabled,
  } = useSound();

  const soundButtons = [
    { label: 'Join Room', sound: playJoin, description: 'Subtle chime when joining' },
    { label: 'Leave Room', sound: playLeave, description: 'Soft descending tone' },
    { label: 'New Message', sound: playMessage, description: 'Pop notification' },
    { label: 'Click', sound: playClick, description: 'Very subtle tap' },
    { label: 'Mic On', sound: playMicOn, description: 'Activation beep' },
    { label: 'Mic Off', sound: playMicOff, description: 'Deactivation beep' },
    { label: 'Error', sound: playError, description: 'Soft alert' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Sound Effects Demo</h1>
          <p className="text-gray-400 mb-6">
            Test all available sound effects. {soundsEnabled ? 'Sounds are enabled.' : 'Sounds are disabled.'}
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {soundButtons.map((item) => (
              <div
                key={item.label}
                className="p-4 rounded-lg bg-white/5 border border-white/10"
              >
                <GlassButton
                  onClick={item.sound}
                  className="w-full mb-2"
                >
                  {item.label}
                </GlassButton>
                <p className="text-sm text-gray-400 text-center">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-sm text-blue-300">
              💡 Tip: Go to Profile → Settings to enable/disable sound effects globally.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
