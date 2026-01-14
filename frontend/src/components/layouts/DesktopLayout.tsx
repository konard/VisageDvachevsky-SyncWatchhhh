import { ReactNode } from 'react';

interface DesktopLayoutProps {
  header?: ReactNode;
  video: ReactNode;
  controls: ReactNode;
  chat: ReactNode;
  voice: ReactNode;
  participants?: ReactNode;
}

/**
 * Desktop Layout (≥1024px)
 * Layout: Video center, Chat right, Controls bottom, Voice bottom-left
 */
export function DesktopLayout({
  header,
  video,
  controls,
  chat,
  voice,
  participants,
}: DesktopLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 overflow-hidden">
      {/* Header */}
      {header && (
        <header className="flex-shrink-0 px-6 py-4 border-b border-white/10">
          {header}
        </header>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Left Section: Video + Controls + Voice */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Video Player */}
          <div className="flex-1 p-4 min-h-0">
            <div className="h-full glass-card overflow-hidden">
              {video}
            </div>
          </div>

          {/* Controls */}
          <div className="flex-shrink-0 px-4 pb-2">
            <div className="glass-panel p-3">
              {controls}
            </div>
          </div>

          {/* Voice Panel */}
          <div className="flex-shrink-0 px-4 pb-4">
            <div className="glass-panel p-4">
              {voice}
            </div>
          </div>
        </div>

        {/* Right Section: Chat + Participants */}
        <div className="w-96 flex-shrink-0 flex flex-col border-l border-white/5">
          {/* Chat Panel */}
          <div className="flex-1 min-h-0">
            {chat}
          </div>

          {/* Participants */}
          {participants && (
            <div className="flex-shrink-0 border-t border-white/5">
              {participants}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
