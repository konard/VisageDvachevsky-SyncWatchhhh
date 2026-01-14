import React from 'react';
import { VoicePeer } from '@syncwatch/shared';
import { VoiceActivityIndicator } from './VoiceActivityIndicator';

interface VoicePeerItemProps {
  peer: VoicePeer;
  onVolumeChange: (volume: number) => void;
}

/**
 * Voice peer item component
 * Displays a single peer in the voice chat
 */
export function VoicePeerItem({ peer, onVolumeChange }: VoicePeerItemProps) {
  const [showVolumeControl, setShowVolumeControl] = React.useState(false);

  return (
    <div className="voice-peer-item">
      <div className="voice-peer-info">
        <div className="voice-peer-avatar">
          {peer.avatarUrl ? (
            <img src={peer.avatarUrl} alt={peer.username} />
          ) : (
            <div className="voice-peer-avatar-placeholder">
              {peer.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="voice-peer-details">
          <div className="voice-peer-name">{peer.username}</div>
          <VoiceActivityIndicator isSpeaking={peer.isSpeaking} />
        </div>
      </div>

      <div className="voice-peer-controls">
        <button
          className={`voice-peer-mute-button ${peer.isMuted ? 'muted' : ''}`}
          onClick={() => setShowVolumeControl(!showVolumeControl)}
          aria-label={peer.isMuted ? 'Unmute' : 'Mute'}
          title="Volume control"
        >
          {peer.isMuted ? '🔇' : '🔊'}
        </button>

        {showVolumeControl && (
          <div className="voice-peer-volume-control">
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={peer.volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              aria-label={`Volume for ${peer.username}`}
            />
            <span className="volume-value">{Math.round(peer.volume * 100)}%</span>
          </div>
        )}

        {/* Audio level indicator */}
        {peer.isSpeaking && (
          <div className="voice-peer-audio-level">
            <div
              className="audio-level-bar"
              style={{ width: `${peer.audioLevel * 100}%` }}
            />
          </div>
        )}

        {/* Connection quality indicator */}
        {peer.quality && (
          <div className={`voice-peer-quality quality-${peer.quality}`} title={`Quality: ${peer.quality}`}>
            {peer.quality === 'excellent' && '●'}
            {peer.quality === 'good' && '●'}
            {peer.quality === 'fair' && '●'}
            {peer.quality === 'poor' && '●'}
          </div>
        )}
      </div>
    </div>
  );
}
