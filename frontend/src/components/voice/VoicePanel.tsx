import { useState } from 'react';
import clsx from 'clsx';
import { useSound } from '@/hooks';

interface Participant {
  id: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
}

interface VoicePanelProps {
  className?: string;
}

/**
 * Voice Panel Component
 * Displays voice chat participants and controls
 */
export function VoicePanel({ className }: VoicePanelProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [participants] = useState<Participant[]>([
    { id: '1', name: 'Alice', isSpeaking: true, isMuted: false },
    { id: '2', name: 'Bob', isSpeaking: false, isMuted: false },
    { id: '3', name: 'Charlie', isSpeaking: false, isMuted: true },
  ]);
  const { playMicOn, playMicOff } = useSound();

  const handleMicToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    // Play appropriate sound
    if (newMutedState) {
      playMicOff();
    } else {
      playMicOn();
    }
  };

  return (
    <div className={clsx('flex flex-col h-full', className)}>
      {/* Voice Controls */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={handleMicToggle}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
              isMuted
                ? 'bg-red-500/20 border border-red-500/50 text-red-300'
                : 'glass-button text-white'
            )}
          >
            <span className="text-xl">{isMuted ? '🔇' : '🎤'}</span>
            <span className="text-sm font-medium">
              {isMuted ? 'Unmute' : 'Mute'}
            </span>
          </button>
        </div>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          Participants ({participants.length})
        </h3>
        <div className="space-y-2">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className={clsx(
                'flex items-center gap-3 p-3 rounded-lg transition-all',
                'bg-white/5 hover:bg-white/10',
                participant.isSpeaking && 'speaking-glow'
              )}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center text-white font-medium">
                {participant.name.charAt(0)}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {participant.name}
                </p>
              </div>

              {/* Status Icons */}
              <div className="flex items-center gap-1">
                {participant.isSpeaking && (
                  <span className="text-green-400 text-sm">🔊</span>
                )}
                {participant.isMuted && (
                  <span className="text-red-400 text-sm">🔇</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
