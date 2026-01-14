/**
 * YouTube Player Demo Component
 * Example usage of the YouTube player for testing and demonstration
 */

import { useState } from 'react';
import { SyncedYouTubePlayer } from './SyncedYouTubePlayer';
import { extractYouTubeVideoId, isValidYouTubeUrl } from '../utils/youtube';
import type { SyncCommand } from '@syncwatch/shared';

export const YouTubePlayerDemo = () => {
  const [videoUrl, setVideoUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [inputUrl, setInputUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [isOwner, setIsOwner] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncLog, setSyncLog] = useState<string[]>([]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    if (!isValidYouTubeUrl(inputUrl)) {
      setError('Invalid YouTube URL. Please check the URL and try again.');
      return;
    }

    const videoId = extractYouTubeVideoId(inputUrl);
    if (!videoId) {
      setError('Could not extract video ID from URL');
      return;
    }

    setVideoUrl(inputUrl);
    setError(null);
    addSyncLog(`Video changed to: ${videoId}`);
  };

  const handleSyncCommand = (command: Omit<SyncCommand, 'sequenceNumber'>) => {
    addSyncLog(`Sync command: ${command.type} at ${new Date().toISOString()}`);
    console.log('Sync command:', command);
  };

  const handlePlaybackReport = (data: { currentTime: number; isPlaying: boolean }) => {
    console.log('Playback report:', data);
  };

  const addSyncLog = (message: string) => {
    setSyncLog(prev => [...prev.slice(-9), message]);
  };

  const exampleVideos = [
    { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up' },
    { id: 'jNQXAC9IVRw', title: 'Me at the zoo (First YouTube video)' },
    { id: '9bZkp7q19f0', title: 'PSY - GANGNAM STYLE' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">YouTube Player Demo</h1>
          <p className="text-gray-300">Test the synchronized YouTube player integration</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Player */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-lg overflow-hidden shadow-2xl">
              <div className="aspect-video relative">
                <SyncedYouTubePlayer
                  videoUrl={videoUrl}
                  isOwner={isOwner}
                  onSyncCommand={handleSyncCommand}
                  onPlaybackReport={handlePlaybackReport}
                  className="absolute inset-0"
                />
              </div>
            </div>

            {/* URL Input */}
            <div className="mt-6 bg-slate-800 rounded-lg p-6">
              <form onSubmit={handleUrlSubmit}>
                <label className="block text-white text-sm font-medium mb-2">
                  YouTube URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="Enter YouTube URL..."
                    className="flex-1 px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Load
                  </button>
                </div>
                {error && (
                  <p className="mt-2 text-red-400 text-sm">{error}</p>
                )}
              </form>

              {/* Example Videos */}
              <div className="mt-4">
                <p className="text-gray-400 text-sm mb-2">Quick examples:</p>
                <div className="flex flex-wrap gap-2">
                  {exampleVideos.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => {
                        const url = `https://www.youtube.com/watch?v=${video.id}`;
                        setInputUrl(url);
                        setVideoUrl(url);
                        setError(null);
                        addSyncLog(`Video changed to: ${video.title}`);
                      }}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
                    >
                      {video.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Controls & Info */}
          <div className="space-y-6">
            {/* Role Toggle */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-white font-medium mb-4">Role</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsOwner(true)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    isOwner
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  👑 Owner
                </button>
                <button
                  onClick={() => setIsOwner(false)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    !isOwner
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  👤 Participant
                </button>
              </div>
              <p className="mt-3 text-gray-400 text-sm">
                {isOwner
                  ? 'As owner, your playback controls will send sync commands.'
                  : 'As participant, you can only view (owner controls disabled in real sync).'}
              </p>
            </div>

            {/* Sync Log */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-white font-medium mb-4">Sync Event Log</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {syncLog.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">No events yet...</p>
                ) : (
                  syncLog.map((log, index) => (
                    <div key={index} className="text-gray-300 text-xs font-mono bg-slate-900 px-2 py-1 rounded">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Info */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-white font-medium mb-4">Supported URL Formats</h3>
              <ul className="text-gray-300 text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <code className="text-xs bg-slate-900 px-2 py-0.5 rounded flex-1">
                    youtube.com/watch?v=...
                  </code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <code className="text-xs bg-slate-900 px-2 py-0.5 rounded flex-1">
                    youtu.be/...
                  </code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <code className="text-xs bg-slate-900 px-2 py-0.5 rounded flex-1">
                    youtube.com/embed/...
                  </code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <code className="text-xs bg-slate-900 px-2 py-0.5 rounded flex-1">
                    youtube.com/v/...
                  </code>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded">
                <p className="text-yellow-200 text-xs">
                  ⚠️ YouTube sync may vary slightly due to API responsiveness
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
