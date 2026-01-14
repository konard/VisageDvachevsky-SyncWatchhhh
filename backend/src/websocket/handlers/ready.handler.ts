import type { Namespace } from 'socket.io';
import type {
  Socket,
  Server,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types/socket.js';
import {
  ReadyInitiateEventSchema,
  ReadyRespondEventSchema,
  type ReadyCheck,
  type ReadyCheckParticipant,
  type ReadyStatus,
  ErrorCodes,
} from '../types/events.js';
import { logger } from '../../config/logger.js';
import { getParticipants } from '../../modules/room/state.service.js';
import { nanoid } from 'nanoid';
import { startCountdown } from './countdown.handler.js';

const READY_CHECK_TIMEOUT_MS = 30000; // 30 seconds

// In-memory storage for active ready checks
// In production, this could be moved to Redis for scalability
const activeReadyChecks = new Map<string, {
  check: ReadyCheck;
  timeoutId: NodeJS.Timeout;
}>();

/**
 * Handle ready check initiation
 */
export function handleReadyInitiate(
  socket: Socket,
  io: Namespace<ClientToServerEvents, ServerToClientEvents>,
  _data: unknown
): void {
  // Validate schema
  const parsed = ReadyInitiateEventSchema.safeParse(_data);
  if (!parsed.success) {
    socket.emit('room:error', {
      code: 'VALIDATION_ERROR',
      message: 'Invalid ready check initiation data',
    });
    return;
  }

  const roomCode = socket.data.roomCode;
  const userId = socket.data.userId || socket.data.sessionId;
  const username = socket.data.guestName || socket.data.userId || 'Unknown';
  const role = socket.data.role;

  if (!roomCode) {
    socket.emit('room:error', {
      code: ErrorCodes.NOT_IN_ROOM,
      message: 'You must be in a room to initiate a ready check',
    });
    return;
  }

  // Only room owner can initiate ready check
  if (role !== 'owner') {
    socket.emit('room:error', {
      code: ErrorCodes.UNAUTHORIZED,
      message: 'Only the room owner can initiate a ready check',
    });
    return;
  }

  // Check if there's already an active ready check for this room
  const existingCheck = Array.from(activeReadyChecks.values()).find(
    (rc) => rc.check.roomId === roomCode
  );

  if (existingCheck) {
    socket.emit('room:error', {
      code: 'READY_CHECK_ACTIVE',
      message: 'A ready check is already in progress',
    });
    return;
  }

  // Get all participants in the room
  getParticipants(roomCode)
    .then((participants) => {
      // Create ready check participants with pending status
      const readyCheckParticipants: ReadyCheckParticipant[] = participants.map((p) => ({
        userId: p.userId || p.socketId,
        username: p.username,
        status: 'pending' as ReadyStatus,
      }));

      // Create ready check
      const checkId = nanoid(10);
      const readyCheck: ReadyCheck = {
        checkId,
        roomId: roomCode,
        initiatedBy: userId,
        participants: readyCheckParticipants,
        timeoutMs: READY_CHECK_TIMEOUT_MS,
        createdAt: Date.now(),
      };

      // Set up timeout
      const timeoutId = setTimeout(() => {
        handleReadyCheckTimeout(io, checkId, roomCode);
      }, READY_CHECK_TIMEOUT_MS);

      // Store active ready check
      activeReadyChecks.set(checkId, { check: readyCheck, timeoutId });

      // Broadcast ready check to all participants
      io.to(roomCode).emit('ready:start', { check: readyCheck });

      logger.info(
        {
          roomCode,
          checkId,
          initiatedBy: userId,
          participantCount: participants.length,
        },
        'Ready check initiated'
      );
    })
    .catch((error) => {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: socket.data.userId,
        },
        'Error initiating ready check'
      );
      socket.emit('room:error', {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to initiate ready check',
      });
    });
}

/**
 * Handle ready check response
 */
export function handleReadyRespond(
  socket: Socket,
  io: Namespace<ClientToServerEvents, ServerToClientEvents>,
  data: unknown
): void {
  // Validate input
  const parsed = ReadyRespondEventSchema.safeParse(data);
  if (!parsed.success) {
    socket.emit('room:error', {
      code: 'VALIDATION_ERROR',
      message: 'Invalid ready check response data',
    });
    return;
  }

  const { checkId, status } = parsed.data;
  const userId = socket.data.userId || socket.data.sessionId;
  const roomCode = socket.data.roomCode;

  if (!roomCode) {
    socket.emit('room:error', {
      code: ErrorCodes.NOT_IN_ROOM,
      message: 'You must be in a room to respond to ready check',
    });
    return;
  }

  // Get active ready check
  const activeCheck = activeReadyChecks.get(checkId);

  if (!activeCheck) {
    socket.emit('room:error', {
      code: 'READY_CHECK_NOT_FOUND',
      message: 'Ready check not found or already completed',
    });
    return;
  }

  const { check } = activeCheck;

  // Verify this ready check is for the current room
  if (check.roomId !== roomCode) {
    socket.emit('room:error', {
      code: 'INVALID_READY_CHECK',
      message: 'This ready check is not for your room',
    });
    return;
  }

  // Find participant and update status
  const participant = check.participants.find((p) => p.userId === userId);

  if (!participant) {
    socket.emit('room:error', {
      code: 'NOT_A_PARTICIPANT',
      message: 'You are not a participant in this ready check',
    });
    return;
  }

  // Update participant status
  participant.status = status;

  // Broadcast updated ready check
  io.to(roomCode).emit('ready:update', { check });

  logger.info(
    {
      roomCode,
      checkId,
      userId,
      status,
    },
    'Ready check response received'
  );

  // Check if all participants are ready
  const allReady = check.participants.every((p) => p.status === 'ready');
  const anyNotReady = check.participants.some((p) => p.status === 'not_ready');

  if (allReady) {
    // Complete the ready check and start countdown
    completeReadyCheck(io, checkId, roomCode, true);
  } else if (anyNotReady) {
    // Someone declined - cancel ready check
    completeReadyCheck(io, checkId, roomCode, false);
  }
}

/**
 * Complete ready check
 */
function completeReadyCheck(
  io: Namespace<ClientToServerEvents, ServerToClientEvents>,
  checkId: string,
  roomCode: string,
  allReady: boolean
): void {
  const activeCheck = activeReadyChecks.get(checkId);

  if (!activeCheck) {
    return;
  }

  // Clear timeout
  clearTimeout(activeCheck.timeoutId);

  // Remove from active checks
  activeReadyChecks.delete(checkId);

  // Broadcast completion
  io.to(roomCode).emit('ready:complete', { checkId, allReady });

  logger.info(
    {
      roomCode,
      checkId,
      allReady,
    },
    'Ready check completed'
  );

  // If all ready, start countdown
  if (allReady) {
    startCountdown(io, roomCode).catch((error) => {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          roomCode,
        },
        'Error starting countdown after ready check'
      );
    });
  }
}

/**
 * Handle ready check timeout
 */
function handleReadyCheckTimeout(
  io: Namespace<ClientToServerEvents, ServerToClientEvents>,
  checkId: string,
  roomCode: string
): void {
  const activeCheck = activeReadyChecks.get(checkId);

  if (!activeCheck) {
    return;
  }

  const { check } = activeCheck;

  // Mark pending participants as timeout
  check.participants.forEach((p) => {
    if (p.status === 'pending') {
      p.status = 'timeout';
    }
  });

  // Broadcast timeout event
  io.to(roomCode).emit('ready:timeout', { checkId });

  // Broadcast final update
  io.to(roomCode).emit('ready:update', { check });

  // Complete ready check (not all ready due to timeout)
  completeReadyCheck(io, checkId, roomCode, false);

  logger.info(
    {
      roomCode,
      checkId,
      pendingCount: check.participants.filter((p) => p.status === 'timeout').length,
    },
    'Ready check timed out'
  );
}

/**
 * Cleanup ready checks when user leaves room
 */
export function cleanupUserReadyChecks(roomCode: string, userId: string): void {
  // Find any active ready checks for this room
  for (const [checkId, activeCheck] of activeReadyChecks.entries()) {
    if (activeCheck.check.roomId === roomCode) {
      const participant = activeCheck.check.participants.find((p) => p.userId === userId);

      if (participant) {
        // Mark user as not ready (they left)
        participant.status = 'not_ready';

        // User leaving counts as "not ready" - cancel the ready check
        // We need access to io, but we don't have it here
        // This will be handled by the disconnect handler
        logger.info(
          {
            roomCode,
            checkId,
            userId,
          },
          'User left during ready check'
        );
      }
    }
  }
}
