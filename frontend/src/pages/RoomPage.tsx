import { useParams } from 'react-router-dom';
import { ResponsiveLayout } from '../components/layouts';
import { ChatPanel } from '../components/chat';
import { VoicePanel } from '../components/voice';
import { VideoControls } from '../components/controls';
import { ParticipantsList } from '../components/participants';
import { Tabs } from '../components/common';
import { AnimatedPage } from '../components/AnimatedPage';

/**
 * Room Page - Responsive layout for watching videos together
 */
export function RoomPage() {
  const { code } = useParams<{ code: string }>();

  // Voice chat handlers (placeholder - to be implemented with WebRTC)
  const handleJoinVoice = () => {
    console.log('Join voice chat');
    // TODO: Implement WebRTC voice connection
  };

  const handleLeaveVoice = () => {
    console.log('Leave voice chat');
    // TODO: Implement WebRTC voice disconnection
  };

  const handleToggleMute = () => {
    console.log('Toggle mute');
    // TODO: Implement microphone mute toggle
  };

  const handleSetPeerVolume = (peerId: string, volume: number) => {
    console.log('Set peer volume', peerId, volume);
    // TODO: Implement peer volume control
  };

  // Header component
  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <img src="/logo.png" alt="SyncWatch" className="w-8 h-8" />
        <h1 className="text-xl font-bold text-white">SyncWatch</h1>
        <span className="text-sm text-gray-400">Room: {code}</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="px-4 py-2 glass-button text-sm">
          Invite
        </button>
        <button className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center text-white font-medium">
          U
        </button>
      </div>
    </div>
  );

  // Video player placeholder
  const video = (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <div className="text-center">
        <p className="text-white text-lg mb-2">Video Player</p>
        <p className="text-gray-400 text-sm">
          Video content will be displayed here
        </p>
      </div>
    </div>
  );

  // Controls component
  const controls = <VideoControls />;

  // Chat component
  const chat = <ChatPanel />;

  // Voice component
  const voice = (
    <VoicePanel
      onJoinVoice={handleJoinVoice}
      onLeaveVoice={handleLeaveVoice}
      onToggleMute={handleToggleMute}
      onSetPeerVolume={handleSetPeerVolume}
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
          icon: '💬',
          content: <ChatPanel />,
        },
        {
          id: 'voice',
          label: 'Voice',
          icon: '🎤',
          content: (
            <VoicePanel
              onJoinVoice={handleJoinVoice}
              onLeaveVoice={handleLeaveVoice}
              onToggleMute={handleToggleMute}
              onSetPeerVolume={handleSetPeerVolume}
            />
          ),
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
    </AnimatedPage>
  );
}
