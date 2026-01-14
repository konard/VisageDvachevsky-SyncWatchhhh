import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useProfile } from '../hooks/useProfile';
import { AnimatedPage } from '../components/AnimatedPage';
import { CreateRoomModal, type RoomOptions } from '../components/room';
import { roomApiService } from '../services';
import {
  Play,
  Users,
  Zap,
  MessageCircle,
  Mic,
  ArrowRight,
  Youtube,
  LogIn,
  UserPlus,
  User,
  LogOut,
} from 'lucide-react';
import clsx from 'clsx';

/**
 * Home Page - Responsive landing page with liquid-glass design
 */
export function HomePage() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [roomCode, setRoomCode] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: user, isLoading: isLoadingProfile } = useProfile();

  const handleCreateRoom = async (options: RoomOptions) => {
    // Call backend API to create room
    const room = await roomApiService.createRoom({
      name: options.name,
      maxParticipants: options.maxParticipants,
      password: options.password,
      playbackControl: options.playbackControl,
    });

    // Navigate to the newly created room using the code from backend
    navigate(`/room/${room.code}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      navigate(`/room/${roomCode.trim()}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.reload();
  };

  return (
    <AnimatedPage className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 animated-gradient">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="SyncWatch"
              className="w-10 h-10"
            />
            <span className="text-xl font-bold text-gradient hidden sm:block">SyncWatch</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              // Show user info when authenticated
              <>
                <div className="flex items-center gap-2 px-4 py-2 glass-panel text-sm text-white">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{user.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              // Show login/register when not authenticated
              !isLoadingProfile && (
                <>
                  <Link
                    to="/login"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">Login</span>
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center gap-2 px-4 py-2 glass-button text-sm text-white"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign Up</span>
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </header>

      <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-20">
        {/* Logo and Title */}
        <div className={clsx('text-center mb-8', isMobile ? 'px-4' : 'px-8')}>
          <div className="relative inline-block">
            <img
              src="/logo.svg"
              alt="SyncWatch"
              className={clsx(
                'mx-auto mb-6 animate-float drop-shadow-2xl',
                isMobile ? 'w-24 h-24' : 'w-32 h-32'
              )}
            />
            {/* Glow effect behind logo */}
            <div className="absolute inset-0 blur-3xl bg-accent-cyan/20 -z-10 animate-pulse-slow" />
          </div>
          <h1
            className={clsx(
              'font-bold text-gradient mb-4',
              isMobile ? 'text-4xl' : 'text-5xl md:text-6xl'
            )}
          >
            SyncWatch
          </h1>
          <p
            className={clsx(
              'text-gray-300',
              isMobile ? 'text-base' : 'text-lg md:text-xl'
            )}
          >
            Watch together, perfectly synchronized
          </p>
        </div>

        {/* Actions Card */}
        <div
          className={clsx(
            'glass-card p-8 space-y-6',
            isMobile ? 'w-full max-w-sm' : 'w-full max-w-md'
          )}
        >
          {/* Create Room */}
          <div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full px-6 py-4 glass-button text-white font-medium text-lg flex items-center justify-center gap-3 group"
            >
              <Play className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span>Create Room</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 glass-panel text-gray-400 rounded-full py-1">or join existing</span>
            </div>
          </div>

          {/* Join Room */}
          <form onSubmit={handleJoinRoom} className="space-y-3">
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter room code"
                className="glass-input w-full text-center uppercase tracking-wider pl-12 pr-4"
                maxLength={8}
              />
            </div>
            <button
              type="submit"
              disabled={!roomCode.trim()}
              className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>Join Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Demo Link */}
          <div className="pt-4 border-t border-white/10">
            <button
              onClick={() => navigate('/youtube-demo')}
              className="w-full px-6 py-3 bg-red-600/80 hover:bg-red-600 text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              <Youtube className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span>YouTube Player Demo</span>
            </button>
          </div>
        </div>

        {/* Features */}
        <div
          className={clsx(
            'mt-12 grid gap-6',
            isMobile
              ? 'grid-cols-1 w-full max-w-sm'
              : 'grid-cols-1 md:grid-cols-3 w-full max-w-4xl'
          )}
        >
          <FeatureCard
            icon={<Zap className="w-8 h-8" />}
            title="Real-time Sync"
            description="Perfect synchronization across all devices with sub-150ms latency"
          />
          <FeatureCard
            icon={<MessageCircle className="w-8 h-8" />}
            title="Live Chat"
            description="Chat with friends while watching together"
          />
          <FeatureCard
            icon={<Mic className="w-8 h-8" />}
            title="Voice Chat"
            description="Crystal-clear voice communication in real-time"
          />
        </div>

        {/* Additional Links */}
        <div className="mt-8 flex items-center gap-4 text-sm text-gray-400">
          <Link to="/design-system" className="hover:text-accent-cyan transition-colors">
            Design System
          </Link>
          <span>•</span>
          <Link to="/sound-demo" className="hover:text-accent-cyan transition-colors">
            Sound Effects
          </Link>
        </div>
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateRoom={handleCreateRoom}
      />
    </AnimatedPage>
  );
}

/**
 * Feature Card Component
 */
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="glass-card p-6 text-center group hover:scale-105 transition-transform duration-300">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 flex items-center justify-center text-accent-cyan group-hover:shadow-glow transition-shadow">
        {icon}
      </div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}
