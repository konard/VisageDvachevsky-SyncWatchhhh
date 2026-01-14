/**
 * DiagnosticsOverlay Component
 * Main debug overlay with draggable, resizable panel showing all diagnostics
 */

import React, { memo, useEffect, useCallback, useRef } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { X, Bug, Maximize2, Minimize2 } from 'lucide-react';
import { useDiagnosticsStore } from '../../stores/diagnostics.store';
import { NetworkMetrics } from './NetworkMetrics';
import { SyncMetrics } from './SyncMetrics';
import { VoiceMetrics } from './VoiceMetrics';
import { SocketMetrics } from './SocketMetrics';
import { DriftTimeline } from './DriftTimeline';

export const DiagnosticsOverlay = memo(() => {
  const isVisible = useDiagnosticsStore((state) => state.preferences.isOverlayVisible);
  const position = useDiagnosticsStore((state) => state.preferences.overlayPosition);
  const size = useDiagnosticsStore((state) => state.preferences.overlaySize);
  const setOverlayVisible = useDiagnosticsStore((state) => state.setOverlayVisible);
  const setOverlayPosition = useDiagnosticsStore((state) => state.setOverlayPosition);
  const setOverlaySize = useDiagnosticsStore((state) => state.setOverlaySize);

  const dragConstraintsRef = useRef<HTMLDivElement>(null);
  const [isMaximized, setIsMaximized] = React.useState(false);

  const handleDragEnd = useCallback(
    (_event: any, info: PanInfo) => {
      setOverlayPosition({
        x: position.x + info.offset.x,
        y: position.y + info.offset.y,
      });
    },
    [position, setOverlayPosition]
  );

  const handleClose = useCallback(() => {
    setOverlayVisible(false);
  }, [setOverlayVisible]);

  const handleToggleMaximize = useCallback(() => {
    if (isMaximized) {
      setOverlaySize({ width: 600, height: 800 });
      setIsMaximized(false);
    } else {
      // Maximize to fill most of the screen
      setOverlaySize({
        width: window.innerWidth - 40,
        height: window.innerHeight - 40,
      });
      setOverlayPosition({ x: 20, y: 20 });
      setIsMaximized(true);
    }
  }, [isMaximized, setOverlaySize, setOverlayPosition]);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Drag constraints container */}
      <div ref={dragConstraintsRef} className="fixed inset-0 pointer-events-none" />

      {/* Overlay panel */}
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{
          left: 0,
          right: window.innerWidth - size.width,
          top: 0,
          bottom: window.innerHeight - size.height,
        }}
        onDragEnd={handleDragEnd}
        initial={{ x: position.x, y: position.y, opacity: 0, scale: 0.9 }}
        animate={{ x: position.x, y: position.y, opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{
          width: size.width,
          height: size.height,
        }}
        className="fixed z-50 flex flex-col"
      >
        {/* Glass panel with backdrop blur */}
        <div className="w-full h-full bg-slate-900/90 backdrop-blur-lg border border-cyan-500/30 rounded-lg shadow-2xl shadow-cyan-500/20 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-cyan-500/20 cursor-move">
            <div className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">Diagnostics Overlay</h2>
              <span className="text-xs text-gray-400 ml-2">Ctrl+Shift+D to toggle</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMaximize}
                className="p-1.5 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                title={isMaximized ? 'Restore' : 'Maximize'}
              >
                {isMaximized ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                title="Close (Ctrl+Shift+D)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            <NetworkMetrics />
            <SyncMetrics />
            <VoiceMetrics />
            <SocketMetrics />
            <DriftTimeline />
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-white/5 border-t border-white/10 text-xs text-gray-400 text-center">
            <div>Metrics update every second • Data kept for last 5 minutes</div>
          </div>
        </div>
      </motion.div>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.5);
        }
      `}</style>
    </>
  );
});

DiagnosticsOverlay.displayName = 'DiagnosticsOverlay';
