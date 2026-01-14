/**
 * DiagnosticsProvider Component
 * Wraps children and provides diagnostics data collection
 * This should be used in rooms where we want to collect metrics
 */

import React, { ReactNode } from 'react';
import { useDiagnostics } from '../../hooks/useDiagnostics';
import { Socket } from 'socket.io-client';
import { ConnectionStatus } from '../../hooks/websocket/useSocket';

interface DiagnosticsProviderProps {
  children: ReactNode;
  socket: Socket | null;
  connectionStatus: ConnectionStatus;
  clockOffset: number;
  rtt: number;
  getServerTime: () => number;
  roomId?: string;
  userId?: string;
}

/**
 * Provider component that enables diagnostics collection
 *
 * Usage:
 * ```tsx
 * <DiagnosticsProvider
 *   socket={socket}
 *   connectionStatus={connectionStatus}
 *   clockOffset={offset}
 *   rtt={rtt}
 *   getServerTime={getServerTime}
 *   roomId={roomId}
 *   userId={userId}
 * >
 *   <YourRoomContent />
 * </DiagnosticsProvider>
 * ```
 */
export const DiagnosticsProvider: React.FC<DiagnosticsProviderProps> = ({
  children,
  socket,
  connectionStatus,
  clockOffset,
  rtt,
  getServerTime,
  roomId,
  userId,
}) => {
  // Initialize diagnostics collection
  useDiagnostics({
    socket,
    connectionStatus,
    clockOffset,
    rtt,
    getServerTime,
    roomId,
    userId,
  });

  return <>{children}</>;
};
