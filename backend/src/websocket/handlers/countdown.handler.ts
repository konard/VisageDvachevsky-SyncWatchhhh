import type { Namespace } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types/socket.js';
import type { CountdownConfig } from '../types/events.js';
import { logger } from '../../config/logger.js';

const COUNTDOWN_DURATION_MS = 3000; // 3 seconds
const COUNTDOWN_STEPS = [3, 2, 1, 'GO!'];
const COUNTDOWN_SYNC_BUFFER_MS = 200; // 200ms buffer for network latency

/**
 * Start countdown sequence for a room
 * This function is called after a successful ready check
 */
export async function startCountdown(
  io: Namespace<ClientToServerEvents, ServerToClientEvents>,
  roomCode: string
): Promise<void> {
  try {
    // Calculate server start time with buffer for network latency
    const serverStartTime = Date.now() + COUNTDOWN_SYNC_BUFFER_MS;

    // Create countdown config
    const countdownConfig: CountdownConfig = {
      durationMs: COUNTDOWN_DURATION_MS,
      steps: COUNTDOWN_STEPS,
      serverStartTime,
    };

    // Broadcast countdown start to all participants
    io.to(roomCode).emit('countdown:start', { config: countdownConfig });

    logger.info(
      {
        roomCode,
        serverStartTime,
        duration: COUNTDOWN_DURATION_MS,
      },
      'Countdown started'
    );

    // Calculate timing for each step
    const stepDuration = COUNTDOWN_DURATION_MS / COUNTDOWN_STEPS.length;

    // Schedule countdown ticks
    COUNTDOWN_STEPS.forEach((step, index) => {
      const delay = COUNTDOWN_SYNC_BUFFER_MS + (index * stepDuration);
      const remaining = COUNTDOWN_DURATION_MS - (index * stepDuration);

      setTimeout(() => {
        io.to(roomCode).emit('countdown:tick', { step, remaining });
        logger.debug(
          {
            roomCode,
            step,
            remaining,
          },
          'Countdown tick'
        );
      }, delay);
    });

    // Schedule countdown completion
    setTimeout(() => {
      io.to(roomCode).emit('countdown:complete', {});
      logger.info(
        {
          roomCode,
        },
        'Countdown completed'
      );
    }, COUNTDOWN_SYNC_BUFFER_MS + COUNTDOWN_DURATION_MS);

  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        roomCode,
      },
      'Error starting countdown'
    );
  }
}
