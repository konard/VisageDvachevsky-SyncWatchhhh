import { useState } from 'react';
import { GlassPanel } from '../ui/glass/GlassPanel';
import { GlassToggle } from '../ui/glass/GlassToggle';
import { GlassButton } from '../ui/glass/GlassButton';

export interface PrivacySettingsProps {
  initialSettings: {
    forceRelay: boolean;
    hideFromSearch: boolean;
    blockNonFriends: boolean;
  };
  onSave: (settings: PrivacySettingsData) => Promise<void>;
}

export interface PrivacySettingsData {
  forceRelay: boolean;
  hideFromSearch: boolean;
  blockNonFriends: boolean;
}

export const PrivacySettings = ({
  initialSettings,
  onSave,
}: PrivacySettingsProps) => {
  const [settings, setSettings] = useState<PrivacySettingsData>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleToggle = (key: keyof PrivacySettingsData) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      await onSave(settings);
      setMessage({ type: 'success', text: 'Privacy settings saved successfully!' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save settings',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  return (
    <GlassPanel className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Privacy Settings</h3>
        <p className="text-sm text-gray-400">
          Control how your information is shared and who can interact with you.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="flex-1 mr-4">
            <h4 className="text-sm font-medium text-white mb-1">
              Force TURN-Only Mode
            </h4>
            <p className="text-xs text-gray-400">
              Always use relay servers for voice connections. This hides your real IP address
              but may increase latency.
            </p>
          </div>
          <GlassToggle
            checked={settings.forceRelay}
            onChange={() => handleToggle('forceRelay')}
          />
        </div>

        <div className="flex items-start justify-between p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="flex-1 mr-4">
            <h4 className="text-sm font-medium text-white mb-1">
              Hide from Search
            </h4>
            <p className="text-xs text-gray-400">
              Prevent your profile from appearing in user search results.
            </p>
          </div>
          <GlassToggle
            checked={settings.hideFromSearch}
            onChange={() => handleToggle('hideFromSearch')}
          />
        </div>

        <div className="flex items-start justify-between p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="flex-1 mr-4">
            <h4 className="text-sm font-medium text-white mb-1">
              Block Non-Friends
            </h4>
            <p className="text-xs text-gray-400">
              Only allow friends to send you room invites and friend requests.
            </p>
          </div>
          <GlassToggle
            checked={settings.blockNonFriends}
            onChange={() => handleToggle('blockNonFriends')}
          />
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <GlassButton
          onClick={handleSave}
          variant="primary"
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </GlassButton>
      </div>
    </GlassPanel>
  );
};
