import { SyncCommand, PlaybackState } from '@syncwatch/shared';
import { PlayerControls } from '../stores/playback.store';

/**
 * Service for executing sync commands on the player
 */
export class SyncExecutorService {
  private scheduledCommands: Map<number, NodeJS.Timeout> = new Map();
  private commandCounter = 0;

  /**
   * Execute a sync command immediately or schedule it for future execution
   * @param command The sync command to execute
   * @param player The player controls
   * @param clockOffset Client clock offset from server time
   */
  executeCommand(
    command: SyncCommand,
    player: PlayerControls,
    clockOffset: number
  ): void {
    if (command.type === 'STATE_SNAPSHOT') {
      // State snapshots are handled by the sync service
      return;
    }

    // Calculate when to execute the command in local time
    const localTime = command.atServerTime - clockOffset;
    const now = Date.now();
    const delay = localTime - now;

    if (delay > 50) {
      // Future command - schedule it
      this.scheduleCommand(command, player, delay);
    } else if (delay > -1000) {
      // Recent past or immediate - execute now
      this.performCommand(command, player);
    } else {
      // Too far in the past - might be outdated, but execute anyway
      console.warn(
        `Command is ${Math.abs(delay)}ms in the past, executing anyway`,
        command
      );
      this.performCommand(command, player);
    }
  }

  /**
   * Schedule a command for future execution
   */
  private scheduleCommand(
    command: SyncCommand,
    player: PlayerControls,
    delayMs: number
  ): void {
    const commandId = this.commandCounter++;

    const timeout = setTimeout(() => {
      this.performCommand(command, player);
      this.scheduledCommands.delete(commandId);
    }, delayMs);

    this.scheduledCommands.set(commandId, timeout);
  }

  /**
   * Perform the actual command on the player
   */
  private performCommand(command: SyncCommand, player: PlayerControls): void {
    try {
      switch (command.type) {
        case 'PLAY':
          if (!player.isPlaying()) {
            player.play();
          }
          break;

        case 'PAUSE':
          if (player.isPlaying()) {
            player.pause();
          }
          break;

        case 'SEEK':
          player.seek(command.targetMediaTime / 1000); // Convert ms to seconds
          break;

        case 'SET_RATE':
          player.setPlaybackRate(command.rate);
          break;
      }
    } catch (error) {
      console.error('Error executing command:', error, command);
    }
  }

  /**
   * Calculate expected media position based on playback state
   */
  calculateExpectedPosition(
    state: PlaybackState,
    clockOffset: number
  ): number {
    if (!state.isPlaying) {
      return state.anchorMediaTimeMs;
    }

    const serverTime = Date.now() + clockOffset;
    const timeSinceAnchor = serverTime - state.anchorServerTimeMs;
    const expectedPosition =
      state.anchorMediaTimeMs + timeSinceAnchor * state.playbackRate;

    return expectedPosition;
  }

  /**
   * Clear all scheduled commands
   */
  clearScheduledCommands(): void {
    for (const timeout of this.scheduledCommands.values()) {
      clearTimeout(timeout);
    }
    this.scheduledCommands.clear();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.clearScheduledCommands();
  }
}
