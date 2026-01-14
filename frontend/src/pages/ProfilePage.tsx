import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import clsx from 'clsx';

/**
 * Profile Page - Responsive user profile page
 */
export function ProfilePage() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'settings'>('profile');

  const header = (
    <div className="flex items-center justify-between">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <span>←</span>
        <span>Back</span>
      </button>
      <h1 className="text-xl font-bold text-white">Profile</h1>
      <div className="w-16"></div> {/* Spacer for centering */}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-4">
        {header}
      </header>

      {/* Content */}
      <div
        className={clsx(
          'mx-auto p-4',
          isMobile ? 'max-w-full' : isTablet ? 'max-w-2xl' : 'max-w-4xl'
        )}
      >
        <div className={clsx('grid gap-6', isMobile ? 'grid-cols-1' : 'grid-cols-3')}>
          {/* Sidebar / Tabs */}
          {!isMobile ? (
            <div className="glass-card p-4 h-fit">
              <nav className="space-y-2">
                {[
                  { id: 'profile', label: 'Profile', icon: '👤' },
                  { id: 'history', label: 'Watch History', icon: '📺' },
                  { id: 'settings', label: 'Settings', icon: '⚙️' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                      activeTab === tab.id
                        ? 'bg-accent-cyan/20 text-accent-cyan'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <span className="text-xl">{tab.icon}</span>
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          ) : (
            <div className="glass-panel p-2 flex gap-2 overflow-x-auto">
              {[
                { id: 'profile', label: 'Profile', icon: '👤' },
                { id: 'history', label: 'History', icon: '📺' },
                { id: 'settings', label: 'Settings', icon: '⚙️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={clsx(
                    'flex-1 flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all whitespace-nowrap',
                    activeTab === tab.id
                      ? 'bg-accent-cyan/20 text-accent-cyan'
                      : 'text-gray-400'
                  )}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Main Content */}
          <div className={clsx(isMobile ? 'col-span-1' : 'col-span-2')}>
            <div className="glass-card p-6">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white mb-4">Profile</h2>

                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center text-white text-3xl font-bold">
                      U
                    </div>
                    <div>
                      <button className="px-4 py-2 glass-button text-sm">
                        Change Avatar
                      </button>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        defaultValue="User123"
                        className="glass-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        defaultValue="user@example.com"
                        className="glass-input w-full"
                      />
                    </div>
                    <button className="px-6 py-3 glass-button">
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-white mb-4">Watch History</h2>
                  <p className="text-gray-400">No watch history yet.</p>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white mb-4">Settings</h2>

                  {/* Settings Options */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                      <span className="text-gray-300">Notifications</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-cyan"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                      <span className="text-gray-300">Auto-play</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-cyan"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
