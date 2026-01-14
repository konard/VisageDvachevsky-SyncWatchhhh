import React from 'react';

interface VoiceActivityIndicatorProps {
  isSpeaking: boolean;
}

/**
 * Voice activity indicator component
 * Shows a visual indicator when a user is speaking
 */
export function VoiceActivityIndicator({ isSpeaking }: VoiceActivityIndicatorProps) {
  return (
    <div className={`voice-activity-indicator ${isSpeaking ? 'speaking' : ''}`}>
      <div className="voice-activity-bar"></div>
      <div className="voice-activity-bar"></div>
      <div className="voice-activity-bar"></div>
      <span className="voice-activity-text">
        {isSpeaking ? 'Speaking' : 'Silent'}
      </span>
    </div>
  );
}
