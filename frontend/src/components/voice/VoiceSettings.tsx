import { useVoiceStore } from '../../stores/voiceStore';
import { VoiceMode } from '@syncwatch/shared';

interface VoiceSettingsProps {
  onClose: () => void;
}

/**
 * Voice settings component
 * Allows users to configure voice chat settings
 */
export function VoiceSettings({ onClose }: VoiceSettingsProps) {
  const { settings, setSettings } = useVoiceStore();

  const handleModeChange = (mode: VoiceMode) => {
    setSettings({ mode });
  };

  const handlePTTKeyChange = (pttKey: string) => {
    setSettings({ pttKey });
  };

  const handleVADThresholdChange = (vadThreshold: number) => {
    setSettings({ vadThreshold });
  };

  const handleToggleSetting = (key: keyof typeof settings) => {
    setSettings({ [key]: !settings[key] });
  };

  return (
    <div className="voice-settings-modal">
      <div className="voice-settings-overlay" onClick={onClose}></div>
      <div className="voice-settings-content">
        <div className="voice-settings-header">
          <h3>Voice Settings</h3>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="voice-settings-body">
          {/* Voice Mode */}
          <div className="setting-group">
            <label>Voice Mode</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="voiceMode"
                  value="push_to_talk"
                  checked={settings.mode === 'push_to_talk'}
                  onChange={() => handleModeChange('push_to_talk')}
                />
                <span>Push-to-Talk</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="voiceMode"
                  value="voice_activity"
                  checked={settings.mode === 'voice_activity'}
                  onChange={() => handleModeChange('voice_activity')}
                />
                <span>Voice Activity Detection</span>
              </label>
            </div>
          </div>

          {/* PTT Key */}
          {settings.mode === 'push_to_talk' && (
            <div className="setting-group">
              <label htmlFor="pttKey">Push-to-Talk Key</label>
              <select
                id="pttKey"
                value={settings.pttKey}
                onChange={(e) => handlePTTKeyChange(e.target.value)}
              >
                <option value="Space">Space</option>
                <option value="KeyV">V</option>
                <option value="KeyT">T</option>
                <option value="ControlLeft">Left Ctrl</option>
                <option value="ShiftLeft">Left Shift</option>
              </select>
            </div>
          )}

          {/* VAD Threshold */}
          {settings.mode === 'voice_activity' && (
            <div className="setting-group">
              <label htmlFor="vadThreshold">
                Voice Activity Threshold: {Math.round((settings.vadThreshold ?? 0.3) * 100)}%
              </label>
              <input
                id="vadThreshold"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.vadThreshold ?? 0.3}
                onChange={(e) => handleVADThresholdChange(parseFloat(e.target.value))}
              />
              <p className="setting-hint">
                Lower = more sensitive, Higher = less sensitive
              </p>
            </div>
          )}

          {/* Audio Processing */}
          <div className="setting-group">
            <label>Audio Processing</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.echoCancellation}
                  onChange={() => handleToggleSetting('echoCancellation')}
                />
                <span>Echo Cancellation</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.noiseSuppression}
                  onChange={() => handleToggleSetting('noiseSuppression')}
                />
                <span>Noise Suppression</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.autoGainControl}
                  onChange={() => handleToggleSetting('autoGainControl')}
                />
                <span>Auto Gain Control</span>
              </label>
            </div>
          </div>
        </div>

        <div className="voice-settings-footer">
          <button className="save-button" onClick={onClose}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
