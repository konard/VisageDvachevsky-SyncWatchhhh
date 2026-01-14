import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { SoundSettings } from '../components/settings';
import { AnimatedPage } from '../components/AnimatedPage';
import clsx from 'clsx';

/**
 * Profile Page - Responsive user profile page
 */
export function ProfilePage() {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
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

  const content = (
    <div className="flex-1 overflow-auto">
      {/* Tab selector */}
      <div className={clsx(
        'flex gap-2 p-4',
        isMobile ? 'overflow-x-auto' : 'justify-center'
      )}>
        <button
          onClick={() => setActiveTab('profile')}
          className={clsx(
            'px-4 py-2 rounded-lg font-medium transition-all',
            activeTab === 'profile'
              ? 'glass-button text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          )}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={clsx(
            'px-4 py-2 rounded-lg font-medium transition-all',
            activeTab === 'history'
              ? 'glass-button text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          )}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={clsx(
            'px-4 py-2 rounded-lg font-medium transition-all',
            activeTab === 'settings'
              ? 'glass-button text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          )}
        >
          Settings
        </button>
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === 'profile' && (
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4">Profile Information</h2>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center text-white text-2xl font-bold">
                U
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Username</h3>
                <p className="text-gray-400">user@example.com</p>
              </div>
            </div>
            <div className="pt-4 space-y-2">
              <p className="text-gray-300"><span className="font-semibold">Joined:</span> January 2026</p>
              <p className="text-gray-300"><span className="font-semibold">Total watch time:</span> 12.5 hours</p>
              <p className="text-gray-300"><span className="font-semibold">Rooms joined:</span> 8</p>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Watch History</h2>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="w-24 h-16 bg-slate-700 rounded flex items-center justify-center text-gray-500">
                    Thumbnail
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">Video Title {i}</h4>
                    <p className="text-sm text-gray-400">Watched 2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Settings</h2>

              {/* Settings Options */}
              <div className="space-y-4">
                {/* Sound Effects Setting */}
                <SoundSettings />

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

            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-white mb-4">Account Actions</h2>
              <div className="space-y-3">
                <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Edit Profile
                </button>
                <button className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
                  Change Password
                </button>
                <button className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AnimatedPage className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="min-h-screen flex flex-col">
        <div className="glass-card p-4">
          {header}
        </div>
        {content}
      </div>
    </AnimatedPage>
  );
}
