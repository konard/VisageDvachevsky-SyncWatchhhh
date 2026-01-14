import React from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Settings,
  Headphones,
  Users,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { useVoiceStore } from '../../stores/voiceStore';
import { VoicePeerItem } from './VoicePeerItem';
import { VoiceControls } from './VoiceControls';
import { VoiceSettings } from './VoiceSettings';
import { GlassButton } from '../ui/glass';

interface VoicePanelProps {
  onJoinVoice: () => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;
  onSetPeerVolume: (peerId: string, volume: number) => void;
}

/**
 * Voice panel component with liquid-glass styling
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
  const isConnecting = connectionState === 'connecting';

  return (
    <div className="voice-panel-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              isInVoice
                ? 'bg-green-500/20 text-green-400'
                : 'bg-white/5 text-gray-400'
            )}
          >
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-medium text-white text-sm">Voice Chat</h3>
            <span className="text-xs text-gray-500">
              {isInVoice
                ? `${peersArray.length + 1} connected`
                : 'Not connected'}
            </span>
          </div>
        </div>
        <button
          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200 hover:rotate-45"
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Voice settings"
        >
          <Settings className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4" role="alert">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Not in voice - Join section */}
      {!isInVoice && (
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 flex items-center justify-center">
            <Mic className="w-8 h-8 text-accent-cyan" />
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Join voice chat to talk with other participants
          </p>
          <GlassButton
            onClick={onJoinVoice}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Headphones className="w-4 h-4 mr-2" />
                Join Voice Chat
              </>
            )}
          </GlassButton>
        </div>
      )}

      {/* In voice - Controls and peers */}
      {isInVoice && (
        <>
          {/* Self controls */}
          <div className="flex items-center gap-2 p-3 glass-card rounded-xl mb-4">
            <div
              className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200',
                isSpeaking
                  ? 'bg-green-500/30 text-green-400 speaking-glow'
                  : isMuted
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-white/10 text-white'
              )}
            >
              {isMuted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">You</p>
              <p className="text-xs text-gray-400">
                {isMuted ? 'Muted' : isSpeaking ? 'Speaking' : 'Listening'}
              </p>
            </div>
            <VoiceControls
              isMuted={isMuted}
              isSpeaking={isSpeaking}
              onToggleMute={onToggleMute}
              onLeaveVoice={onLeaveVoice}
            />
          </div>

          {/* Peers section */}
          {peersArray.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                  Participants ({peersArray.length})
                </span>
              </div>
              <div className="space-y-2">
                {peersArray.map((peer) => (
                  <VoicePeerItem
                    key={peer.userId}
                    peer={peer}
                    onVolumeChange={(volume) => onSetPeerVolume(peer.userId, volume)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Disconnect button */}
          <button
            onClick={onLeaveVoice}
            className="w-full mt-4 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
            Disconnect
          </button>
        </>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <VoiceSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
