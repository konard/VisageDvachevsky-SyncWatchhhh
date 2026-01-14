import React from 'react';
import { useVoiceStore } from '../../stores/voiceStore';
import { VoicePeerItem } from './VoicePeerItem';
import { VoiceControls } from './VoiceControls';
import { VoiceSettings } from './VoiceSettings';

interface VoicePanelProps {
  onJoinVoice: () => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;
  onSetPeerVolume: (peerId: string, volume: number) => void;
}

/**
 * Voice panel component
 * Displays voice chat status, peers, and controls
 */
export function VoicePanel({
  onJoinVoice,
  onLeaveVoice,
  onToggleMute,
  onSetPeerVolume,
}: VoicePanelProps) {
  const { isInVoice, peers, isMuted, isSpeaking, connectionState, error } = useVoiceStore();

  const [showSettings, setShowSettings] = React.useState(false);

  const peersArray = Array.from(peers.values());

  return (
    <div className="voice-panel">
      <div className="voice-panel-header">
        <h3>Voice Chat</h3>
        <button
          className="settings-button"
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Voice settings"
        >
          ⚙️
        </button>
      </div>

      {error && (
        <div className="voice-error" role="alert">
          {error}
        </div>
      )}

      {!isInVoice && (
        <div className="voice-join-section">
          <button
            className="join-voice-button"
            onClick={onJoinVoice}
            disabled={connectionState === 'connecting'}
          >
            {connectionState === 'connecting' ? 'Connecting...' : 'Join Voice Chat'}
          </button>
        </div>
      )}

      {isInVoice && (
        <>
          <VoiceControls
            isMuted={isMuted}
            isSpeaking={isSpeaking}
            onToggleMute={onToggleMute}
            onLeaveVoice={onLeaveVoice}
          />

          <div className="voice-peers-section">
            <h4>Participants ({peersArray.length})</h4>
            <div className="voice-peers-list">
              {peersArray.map((peer) => (
                <VoicePeerItem
                  key={peer.userId}
                  peer={peer}
                  onVolumeChange={(volume) => onSetPeerVolume(peer.userId, volume)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {showSettings && (
        <VoiceSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
