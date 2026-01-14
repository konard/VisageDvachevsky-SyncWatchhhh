import { Server as HTTPServer } from 'http';
import { Server as IOServer, Namespace } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  Socket,
} from './types/socket.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { handleRoomJoin, handleRoomLeave, handleDisconnect } from './handlers/room.handler.js';
import {
  handleVoiceJoin,
  handleVoiceLeave,
  handleVoiceSignal,
  handleVoiceSpeaking,
} from './handlers/voice.handler.js';
import { ClientEvents } from './types/events.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

/**
 * Initialize Socket.io server
 */
export function createSocketServer(
  httpServer: HTTPServer
): Namespace<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  const io = new IOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
    pingTimeout: env.WS_PING_TIMEOUT,
    pingInterval: env.WS_PING_INTERVAL,
    transports: ['websocket', 'polling'],
  });

  // Create /sync namespace for room synchronization
  const syncNamespace = io.of('/sync');

  // Apply middleware
  syncNamespace.use(authMiddleware);
  syncNamespace.use(errorHandler);

  // Connection handler
  syncNamespace.on('connection', (socket: Socket) => {
    logger.info(
      {
        socketId: socket.id,
        userId: socket.data.userId,
        sessionId: socket.data.sessionId,
        isGuest: socket.data.isGuest,
      },
      'Socket connected to /sync namespace'
    );

    // Register room event handlers
    socket.on(ClientEvents.ROOM_JOIN, (data: unknown) => handleRoomJoin(socket, syncNamespace, data as any));
    socket.on(ClientEvents.ROOM_LEAVE, (data: unknown) => handleRoomLeave(socket, syncNamespace, data as any));

    // Register voice event handlers
    socket.on('voice:join', (data: unknown) => handleVoiceJoin(socket, syncNamespace, data as any));
    socket.on('voice:leave', (data: unknown) => handleVoiceLeave(socket, syncNamespace, data as any));
    socket.on('voice:signal', (data: unknown) => handleVoiceSignal(socket, syncNamespace, data as any));
    socket.on('voice:speaking', (data: unknown) => handleVoiceSpeaking(socket, syncNamespace, data as any));

    // Handle disconnect
    socket.on('disconnect', () => handleDisconnect(socket, syncNamespace));

    // Heartbeat/ping-pong is handled automatically by Socket.io
    // with pingTimeout and pingInterval options
  });

  logger.info('Socket.io server initialized with /sync namespace');

  return syncNamespace;
}

/**
 * Close Socket.io server
 */
export async function closeSocketServer(
  io: Namespace<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
): Promise<void> {
  return new Promise((resolve) => {
    // Disconnect all sockets in the namespace
    io.disconnectSockets();
    logger.info('Socket.io server closed');
    resolve();
  });
}
