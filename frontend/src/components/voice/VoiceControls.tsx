interface VoiceControlsProps {
  isMuted: boolean;
  isSpeaking: boolean;
  onToggleMute: () => void;
  onLeaveVoice: () => void;
}

/**
 * Voice controls component
 * Displays local user controls (mute, leave)
 */
export function VoiceControls({
  isMuted,
  isSpeaking,
  onToggleMute,
  onLeaveVoice,
}: VoiceControlsProps) {
  return (
    <div className="voice-controls">
      <div className="voice-local-status">
        <div className={`voice-speaking-indicator ${isSpeaking ? 'active' : ''}`}>
          {isSpeaking ? '🎤 Speaking' : '🔇 Silent'}
        </div>
      </div>

      <div className="voice-control-buttons">
        <button
          className={`voice-mute-button ${isMuted ? 'muted' : ''}`}
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? '🔇 Unmute' : '🎤 Mute'}
        </button>

        <button
          className="voice-leave-button"
          onClick={onLeaveVoice}
          aria-label="Leave voice chat"
          title="Leave voice chat"
        >
          📞 Leave
        </button>
      </div>
    </div>
  );
}
