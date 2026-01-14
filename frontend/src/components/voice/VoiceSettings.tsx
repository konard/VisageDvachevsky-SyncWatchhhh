import { useVoiceStore } from '../../stores/voiceStore';
import { VoiceMode, NoiseSuppressionLevel } from '@syncwatch/shared';

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

  const handlePTTMouseButtonChange = (value: string) => {
    const pttMouseButton = value === 'none' ? undefined : parseInt(value, 10);
    setSettings({ pttMouseButton });
  };

  const handleVADThresholdChange = (vadThreshold: number) => {
    setSettings({ vadThreshold });
  };

  const handleNoiseSuppressionLevelChange = (noiseSuppressionLevel: NoiseSuppressionLevel) => {
    setSettings({ noiseSuppressionLevel });
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
            <>
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
                  <option value="KeyB">B</option>
                  <option value="KeyC">C</option>
                  <option value="ControlLeft">Left Ctrl</option>
                  <option value="ControlRight">Right Ctrl</option>
                  <option value="ShiftLeft">Left Shift</option>
                  <option value="ShiftRight">Right Shift</option>
                  <option value="AltLeft">Left Alt</option>
                  <option value="AltRight">Right Alt</option>
                </select>
              </div>

              <div className="setting-group">
                <label htmlFor="pttMouseButton">Push-to-Talk Mouse Button</label>
                <select
                  id="pttMouseButton"
                  value={settings.pttMouseButton?.toString() || 'none'}
                  onChange={(e) => handlePTTMouseButtonChange(e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="3">Mouse 4 (Back)</option>
                  <option value="4">Mouse 5 (Forward)</option>
                </select>
                <p className="setting-hint">
                  Additional mouse button for Push-to-Talk
                </p>
              </div>
            </>
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

          {/* Noise Suppression Level */}
          <div className="setting-group">
            <label htmlFor="noiseSuppressionLevel">Noise Suppression Level</label>
            <select
              id="noiseSuppressionLevel"
              value={settings.noiseSuppressionLevel}
              onChange={(e) => handleNoiseSuppressionLevelChange(e.target.value as NoiseSuppressionLevel)}
            >
              <option value="off">Off</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="maximum">Maximum</option>
            </select>
            <p className="setting-hint">
              Higher levels reduce more background noise but may affect voice quality
            </p>
          </div>

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
