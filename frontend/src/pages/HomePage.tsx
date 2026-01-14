import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import clsx from 'clsx';

/**
 * Home Page - Responsive landing page
 */
export function HomePage() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [roomCode, setRoomCode] = useState('');

  const handleCreateRoom = () => {
    // Generate random room code (placeholder)
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/room/${code}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      navigate(`/room/${roomCode.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 animated-gradient">
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        {/* Logo and Title */}
        <div className={clsx('text-center mb-8', isMobile ? 'px-4' : 'px-8')}>
          <img
            src="/logo.png"
            alt="SyncWatch"
            className={clsx(
              'mx-auto mb-6 animate-float',
              isMobile ? 'w-24 h-24' : 'w-32 h-32'
            )}
          />
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
              onClick={handleCreateRoom}
              className="w-full px-6 py-4 glass-button text-white font-medium text-lg"
            >
              <span className="mr-2">🎬</span>
              Create Room
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-transparent text-gray-400">or</span>
            </div>
          </div>

          {/* Join Room */}
          <form onSubmit={handleJoinRoom} className="space-y-3">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter room code"
              className="glass-input w-full text-center uppercase tracking-wider"
              maxLength={8}
            />
            <button
              type="submit"
              disabled={!roomCode.trim()}
              className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200"
            >
              Join Room
            </button>
          </form>

          {/* Demo Link */}
          <div className="pt-4 border-t border-white/10">
            <button
              onClick={() => navigate('/youtube-demo')}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
            >
              <span className="mr-2">▶️</span>
              YouTube Player Demo
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
          <div className="glass-card p-6 text-center">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold text-white mb-2">Real-time Sync</h3>
            <p className="text-sm text-gray-400">
              Perfect synchronization across all devices
            </p>
          </div>
          <div className="glass-card p-6 text-center">
            <div className="text-3xl mb-3">💬</div>
            <h3 className="font-semibold text-white mb-2">Live Chat</h3>
            <p className="text-sm text-gray-400">
              Chat with friends while watching together
            </p>
          </div>
          <div className="glass-card p-6 text-center">
            <div className="text-3xl mb-3">🎤</div>
            <h3 className="font-semibold text-white mb-2">Voice Chat</h3>
            <p className="text-sm text-gray-400">
              Talk with your friends in real-time
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
