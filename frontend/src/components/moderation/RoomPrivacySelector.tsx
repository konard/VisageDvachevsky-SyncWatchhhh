import { useState } from 'react';

export type PrivacyPreset = 'public' | 'friends_only' | 'private' | 'anonymous';

export interface RoomPrivacySelectorProps {
  value: PrivacyPreset;
  onChange: (preset: PrivacyPreset) => void;
  disabled?: boolean;
}

interface PresetOption {
  value: PrivacyPreset;
  label: string;
  description: string;
  icon: string;
  features: string[];
}

const PRESETS: PresetOption[] = [
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone can join with the room link',
    icon: '🌍',
    features: ['Open to all', 'Visible names', 'Direct P2P connections'],
  },
  {
    value: 'friends_only',
    label: 'Friends Only',
    description: 'Only your friends can join',
    icon: '👥',
    features: ['Friends only', 'Visible names', 'Authentication required'],
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Password-protected room',
    icon: '🔒',
    features: ['Password required', 'Visible names', 'Unlisted'],
  },
  {
    value: 'anonymous',
    label: 'Anonymous',
    description: 'Maximum privacy with hidden identities',
    icon: '🕵️',
    features: ['Anonymous names', 'IP hidden (TURN-only)', 'Unlisted'],
  },
];

export const RoomPrivacySelector = ({
  value,
  onChange,
  disabled = false,
}: RoomPrivacySelectorProps) => {
  const [selectedPreset, setSelectedPreset] = useState<PrivacyPreset>(value);

  const handleSelect = (preset: PrivacyPreset) => {
    if (!disabled) {
      setSelectedPreset(preset);
      onChange(preset);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-200">
        Room Privacy Preset
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PRESETS.map((preset) => {
          const isSelected = selectedPreset === preset.value;

          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => handleSelect(preset.value)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 text-left transition-all
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <svg
                    className="w-5 h-5 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}

              <div className="flex items-start gap-3 mb-2">
                <span className="text-2xl">{preset.icon}</span>
                <div>
                  <h4 className="font-semibold text-white">{preset.label}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {preset.description}
                  </p>
                </div>
              </div>

              <ul className="space-y-1 ml-11">
                {preset.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-gray-400 flex items-center gap-1.5"
                  >
                    <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
};
