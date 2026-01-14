import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Copy,
  Share2,
  Users,
  MessageCircle,
  Headphones,
  Play,
  Upload,
  Link as LinkIcon,
  ChevronDown,
} from 'lucide-react';
import { ResponsiveLayout } from '../components/layouts';
import { ChatPanel } from '../components/chat';
import { VoicePanel } from '../components/voice';
import { VideoControls } from '../components/controls';
import { ParticipantsList } from '../components/participants';
import { Tabs } from '../components/common';
import { AnimatedPage } from '../components/AnimatedPage';
import { GlassAvatar, GlassModal, GlassButton, GlassInput } from '../components/ui/glass';
import { SyncStatusIndicator } from '../components/sync/SyncStatusIndicator';
import { useSocket } from '../hooks/useSocket';
import { useVoice } from '../hooks/useVoice';

/**
 * Room Page - Main watch room with liquid-glass design
 */
export function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Socket connection for voice chat
  const { socket } = useSocket(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
    namespace: '/sync',
    autoConnect: true,
    showToasts: false, // Avoid duplicate toasts
  });

  // Voice chat functionality
  const { joinVoice, leaveVoice, toggleMute, setPeerVolume } = useVoice(socket);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inviteUrl = `${window.location.origin}/room/${code}`;

  // Header component
  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img src="/logo.svg" alt="SyncWatch" className="w-9 h-9" />
          <span className="text-xl font-bold text-gradient hidden sm:block">SyncWatch</span>
        </Link>

        {/* Room info */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 glass-panel rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-gray-300">Room:</span>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 text-sm font-mono text-accent-cyan hover:text-white transition-colors group"
          >
            <span>{code}</span>
            <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Sync Status (desktop only) */}
        <div className="hidden lg:block">
          <SyncStatusIndicator showDetails showResyncButton={false} />
        </div>

        {/* Invite button */}
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 glass-button text-sm"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Invite</span>
        </button>

        {/* User menu */}
        <button className="flex items-center gap-2 group">
          <GlassAvatar size="sm" fallback="U" />
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors hidden sm:block" />
        </button>
      </div>
    </div>
  );

  // Video player with source selection
  const video = (
    <div className="w-full h-full bg-black/50 flex flex-col items-center justify-center relative group">
      {/* Video placeholder */}
      <div className="text-center px-4">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 flex items-center justify-center">
          <Play className="w-10 h-10 text-accent-cyan" />
        </div>
        <p className="text-white text-lg mb-2">No video source selected</p>
        <p className="text-gray-400 text-sm mb-6">
          Add a video to start watching together
        </p>
        <GlassButton onClick={() => setShowSourceModal(true)}>
          <LinkIcon className="w-4 h-4 mr-2" />
          Add Video Source
        </GlassButton>
      </div>

      {/* Video controls overlay - shown on hover */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-center text-sm text-gray-400">
          Video controls will appear here
        </div>
      </div>
    </div>
  );

  // Controls component
  const controls = <VideoControls showSyncStatus={false} />;

  // Chat component
  const chat = <ChatPanel />;

  // Voice component
  const voice = (
    <VoicePanel
      onJoinVoice={joinVoice}
      onLeaveVoice={leaveVoice}
      onToggleMute={toggleMute}
      onSetPeerVolume={setPeerVolume}
    />
  );

  // Participants component
  const participants = <ParticipantsList />;

  // Tab content for mobile/tablet (combines chat and voice)
  const tabContent = (
    <Tabs
      tabs={[
        {
          id: 'chat',
          label: 'Chat',
          icon: <MessageCircle className="w-4 h-4" />,
          content: <ChatPanel />,
        },
        {
          id: 'voice',
          label: 'Voice',
          icon: <Headphones className="w-4 h-4" />,
          content: (
            <VoicePanel
              onJoinVoice={joinVoice}
              onLeaveVoice={leaveVoice}
              onToggleMute={toggleMute}
              onSetPeerVolume={setPeerVolume}
            />
          ),
        },
        {
          id: 'participants',
          label: 'People',
          icon: <Users className="w-4 h-4" />,
          content: <ParticipantsList />,
        },
      ]}
      defaultTab="chat"
    />
  );

  return (
    <AnimatedPage>
      <ResponsiveLayout
        header={header}
        video={video}
        controls={controls}
        chat={chat}
        voice={voice}
        participants={participants}
        tabContent={tabContent}
      />

      {/* Invite Modal */}
      <GlassModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Friends"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Share this room code or link with your friends to invite them.
          </p>

          {/* Room Code */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
              Room Code
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 glass-panel rounded-xl text-center">
                <span className="text-2xl font-mono font-bold text-accent-cyan tracking-widest">
                  {code}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="w-12 h-12 glass-button flex items-center justify-center"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            {copied && (
              <p className="text-xs text-green-400 mt-2 text-center">
                Copied to clipboard!
              </p>
            )}
          </div>

          {/* Full Link */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
              Invite Link
            </label>
            <div className="relative">
              <GlassInput
                value={inviteUrl}
                readOnly
                className="pr-12 text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </GlassModal>

      {/* Video Source Modal */}
      <GlassModal
        isOpen={showSourceModal}
        onClose={() => setShowSourceModal(false)}
        title="Add Video Source"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Choose how you want to add a video to this room.
          </p>

          {/* Source options */}
          <div className="grid gap-3">
            <button className="flex items-center gap-4 p-4 glass-card rounded-xl hover:bg-white/5 transition-colors text-left group">
              <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">YouTube Video</h4>
                <p className="text-sm text-gray-400">Paste a YouTube URL to watch together</p>
              </div>
            </button>

            <button className="flex items-center gap-4 p-4 glass-card rounded-xl hover:bg-white/5 transition-colors text-left group">
              <div className="w-12 h-12 rounded-xl bg-accent-cyan/20 flex items-center justify-center text-accent-cyan group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">Upload Video</h4>
                <p className="text-sm text-gray-400">Upload a video file (up to 8GB)</p>
              </div>
            </button>

            <button className="flex items-center gap-4 p-4 glass-card rounded-xl hover:bg-white/5 transition-colors text-left group">
              <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <LinkIcon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">External URL</h4>
                <p className="text-sm text-gray-400">Enter a direct video URL (m3u8, mp4)</p>
              </div>
            </button>
          </div>
        </div>
      </GlassModal>
    </AnimatedPage>
  );
}
