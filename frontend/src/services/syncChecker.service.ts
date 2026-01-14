import {
  PlaybackState,
  SYNC_TOLERANCE_MS,
  SOFT_RESYNC_THRESHOLD_MS,
  SOFT_RESYNC_RATE_FAST,
  SOFT_RESYNC_RATE_SLOW,
} from '@syncwatch/shared';
import { PlayerControls, SyncStatus } from '../stores/playback.store';

/**
 * Result of a sync check operation
 */
export interface SyncCheckResult {
  drift: number;
  status: SyncStatus;
  action: 'none' | 'soft_sync' | 'hard_sync';
}

/**
 * Service for checking and correcting playback synchronization
 */
export class SyncCheckerService {
  private softSyncActive = false;
  private softSyncTimeout: NodeJS.Timeout | null = null;

  /**
   * Check if the player is synchronized with the expected playback state
   * @param state Current playback state from server
   * @param player Player controls
   * @param clockOffset Client clock offset from server
   * @returns Sync check result with drift and recommended action
   */
  checkSync(
    state: PlaybackState,
    player: PlayerControls,
    clockOffset: number
  ): SyncCheckResult {
    // Calculate expected media position
    const expectedTime = this.calculateExpectedPosition(state, clockOffset);

    // Get actual position from player (in milliseconds)
    const actualTime = player.getCurrentTime() * 1000;

    // Calculate drift (positive = ahead, negative = behind)
    const drift = actualTime - expectedTime;

    // Determine sync status and action
    if (Math.abs(drift) < SYNC_TOLERANCE_MS) {
      return {
        drift,
        status: 'synced',
        action: 'none',
      };
    } else if (Math.abs(drift) < SOFT_RESYNC_THRESHOLD_MS) {
      // Use soft resync for drift < 1 second (gradual rate adjustment)
      return {
        drift,
        status: 'syncing',
        action: 'soft_sync',
      };
    } else {
      // Use hard sync for drift >= 1 second (immediate seek)
      return {
        drift,
        status: 'drifted',
        action: 'hard_sync',
      };
    }
  }

  /**
   * Apply sync correction based on check result
   * @param result Sync check result
   * @param state Current playback state
   * @param player Player controls
   */
  applySync(
    result: SyncCheckResult,
    state: PlaybackState,
    player: PlayerControls
  ): void {
    switch (result.action) {
      case 'none':
        // Reset to normal playback rate if we were soft syncing
        if (this.softSyncActive) {
          this.resetPlaybackRate(player, state.playbackRate);
        }
        break;

      case 'soft_sync':
        this.applySoftSync(result.drift, player, state.playbackRate);
        break;

      case 'hard_sync':
        this.applyHardSync(result.drift, player, state);
        break;
    }
  }

  /**
   * Apply soft sync by adjusting playback rate
   * If ahead: slow down to 0.97x
   * If behind: speed up to 1.03x
   * This provides smooth synchronization without video jerking
   */
  private applySoftSync(
    drift: number,
    player: PlayerControls,
    baseRate: number
  ): void {
    if (!player.isPlaying()) {
      return;
    }

    // Use the new soft resync rates (3% adjustment instead of the old 2%)
    const adjustedRate =
      drift > 0
        ? baseRate * SOFT_RESYNC_RATE_SLOW  // Slow down to 0.97x if ahead
        : baseRate * SOFT_RESYNC_RATE_FAST; // Speed up to 1.03x if behind

    try {
      player.setPlaybackRate(adjustedRate);
      this.softSyncActive = true;

      // Calculate duration needed to correct the drift
      // drift / (rate difference * base rate) = time in ms
      const rateDiff = Math.abs(adjustedRate - baseRate);
      const correctionDuration = Math.abs(drift) / (rateDiff * baseRate);

      // Reset to normal rate after correction completes or max 3 seconds
      const resetDelay = Math.min(correctionDuration, 3000);

      if (this.softSyncTimeout) {
        clearTimeout(this.softSyncTimeout);
      }
      this.softSyncTimeout = setTimeout(() => {
        this.resetPlaybackRate(player, baseRate);
      }, resetDelay);
    } catch (error) {
      console.error('Error applying soft sync:', error);
    }
  }

  /**
   * Apply hard sync by seeking to the correct position
   */
  private applyHardSync(
    drift: number,
    player: PlayerControls,
    state: PlaybackState
  ): void {
    try {
      const expectedTimeSeconds =
        this.calculateExpectedPosition(state, 0) / 1000;
      player.seek(expectedTimeSeconds);

      // Reset to normal playback rate
      player.setPlaybackRate(state.playbackRate);
      this.softSyncActive = false;

      console.log(
        `Hard sync: drift=${drift.toFixed(0)}ms, seeking to ${expectedTimeSeconds.toFixed(2)}s`
      );
    } catch (error) {
      console.error('Error applying hard sync:', error);
    }
  }

  /**
   * Reset playback rate to normal
   */
  private resetPlaybackRate(player: PlayerControls, rate: number): void {
    if (this.softSyncActive) {
      try {
        player.setPlaybackRate(rate);
        this.softSyncActive = false;
      } catch (error) {
        console.error('Error resetting playback rate:', error);
      }
    }

    if (this.softSyncTimeout) {
      clearTimeout(this.softSyncTimeout);
      this.softSyncTimeout = null;
    }
  }

  /**
   * Calculate expected media position based on playback state
   */
  private calculateExpectedPosition(
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
   * Clean up resources
   */
  destroy(): void {
    if (this.softSyncTimeout) {
      clearTimeout(this.softSyncTimeout);
      this.softSyncTimeout = null;
    }
    this.softSyncActive = false;
  }
}
