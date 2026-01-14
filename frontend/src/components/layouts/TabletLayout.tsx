import { ReactNode } from 'react';

interface TabletLayoutProps {
  header?: ReactNode;
  video: ReactNode;
  controls: ReactNode;
  tabContent: ReactNode; // Chat/Voice tabs
}

/**
 * Tablet Layout (768px - 1023px)
 * Layout: Video top, Chat/Voice tabs bottom
 */
export function TabletLayout({
  header,
  video,
  controls,
  tabContent,
}: TabletLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 overflow-hidden">
      {/* Header */}
      {header && (
        <header className="flex-shrink-0 px-4 py-3 border-b border-white/10">
          {header}
        </header>
      )}

      {/* Video Section */}
      <div className="flex-shrink-0 p-4">
        <div className="glass-card overflow-hidden aspect-video">
          {video}
        </div>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 px-4 pb-2">
        <div className="glass-panel p-3">
          {controls}
        </div>
      </div>

      {/* Tabs Section (Chat/Voice) */}
      <div className="flex-1 min-h-0 px-4 pb-4">
        <div className="h-full glass-panel overflow-hidden">
          {tabContent}
        </div>
      </div>
    </div>
  );
}
