import { ReactNode } from 'react';
import { useOrientation } from '../../hooks/useOrientation';

interface MobileLayoutProps {
  header?: ReactNode;
  video: ReactNode;
  controls: ReactNode;
  tabContent: ReactNode; // Chat/Voice tabs
}

/**
 * Mobile Layout (<768px)
 * Layout: Video top, Chat/Voice tabs bottom
 * Handles portrait and landscape orientations
 */
export function MobileLayout({
  header,
  video,
  controls,
  tabContent,
}: MobileLayoutProps) {
  const orientation = useOrientation();

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 overflow-hidden">
      {/* Header */}
      {header && (
        <header className="flex-shrink-0 px-3 py-2 border-b border-white/10">
          {header}
        </header>
      )}

      {/* Video Section */}
      <div className={`flex-shrink-0 p-3 ${orientation === 'landscape' ? 'flex-1' : ''}`}>
        <div className={`glass-card overflow-hidden ${orientation === 'portrait' ? 'aspect-video' : 'h-full'}`}>
          {video}
        </div>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 px-3 pb-2">
        <div className="glass-panel p-2">
          {controls}
        </div>
      </div>

      {/* Tabs Section (Chat/Voice) - Hidden in landscape on very small screens */}
      {orientation === 'portrait' && (
        <div className="flex-1 min-h-0 px-3 pb-3">
          <div className="h-full glass-panel overflow-hidden">
            {tabContent}
          </div>
        </div>
      )}

      {/* In landscape, show minimal tab content */}
      {orientation === 'landscape' && (
        <div className="flex-shrink-0 px-3 pb-3" style={{ maxHeight: '30vh' }}>
          <div className="h-full glass-panel overflow-hidden">
            {tabContent}
          </div>
        </div>
      )}
    </div>
  );
}
