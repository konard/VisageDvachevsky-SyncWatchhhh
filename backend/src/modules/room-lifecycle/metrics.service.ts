/**
 * Participant Metrics Service
 * Tracks network stability metrics for auto-host selection
 */

import { prisma } from '../../database/client.js';
import { NotFoundError } from '../../common/errors/index.js';
import type { ParticipantMetrics } from './types.js';

export class ParticipantMetricsService {
  /**
   * Update participant metrics
   */
  async updateMetrics(
    roomId: string,
    userId: string,
    metrics: Partial<ParticipantMetrics>
  ): Promise<ParticipantMetrics> {
    // Verify room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundError('Room');
    }

    // Get or create metrics record
    const existing = await prisma.participantMetrics.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    const stabilityScore = this.computeStabilityScore({
      avgLatencyMs: metrics.avgLatencyMs ?? existing?.avgLatencyMs ?? 0,
      packetLossPercent: metrics.packetLossPercent ?? existing?.packetLossPercent ?? 0,
      connectionUptime: metrics.connectionUptime ?? Number(existing?.connectionUptime ?? 0),
      stabilityScore: 0,
      userId,
    });

    if (existing) {
      const updated = await prisma.participantMetrics.update({
        where: { id: existing.id },
        data: {
          avgLatencyMs: metrics.avgLatencyMs ?? existing.avgLatencyMs,
          packetLossPercent: metrics.packetLossPercent ?? existing.packetLossPercent,
          connectionUptime: metrics.connectionUptime ?? existing.connectionUptime,
          stabilityScore,
          lastUpdated: new Date(),
        },
      });

      return {
        userId: updated.userId,
        avgLatencyMs: updated.avgLatencyMs,
        packetLossPercent: updated.packetLossPercent,
        connectionUptime: Number(updated.connectionUptime),
        stabilityScore: updated.stabilityScore,
      };
    } else {
      const created = await prisma.participantMetrics.create({
        data: {
          roomId,
          userId,
          avgLatencyMs: metrics.avgLatencyMs ?? 0,
          packetLossPercent: metrics.packetLossPercent ?? 0,
          connectionUptime: metrics.connectionUptime ?? 0,
          stabilityScore,
        },
      });

      return {
        userId: created.userId,
        avgLatencyMs: created.avgLatencyMs,
        packetLossPercent: created.packetLossPercent,
        connectionUptime: Number(created.connectionUptime),
        stabilityScore: created.stabilityScore,
      };
    }
  }

  /**
   * Compute stability score
   * Lower is better
   */
  private computeStabilityScore(metrics: ParticipantMetrics): number {
    const latencyScore = metrics.avgLatencyMs / 100;
    const lossScore = metrics.packetLossPercent * 2;
    const uptimeBonus = Math.min(metrics.connectionUptime / 3600000, 1) * -0.5;

    return latencyScore + lossScore + uptimeBonus;
  }

  /**
   * Get metrics for a participant
   */
  async getMetrics(roomId: string, userId: string): Promise<ParticipantMetrics | null> {
    const metrics = await prisma.participantMetrics.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (!metrics) {
      return null;
    }

    return {
      userId: metrics.userId,
      avgLatencyMs: metrics.avgLatencyMs,
      packetLossPercent: metrics.packetLossPercent,
      connectionUptime: Number(metrics.connectionUptime),
      stabilityScore: metrics.stabilityScore,
    };
  }

  /**
   * Get all participants with metrics for a room
   */
  async getRoomMetrics(roomId: string): Promise<ParticipantMetrics[]> {
    const metrics = await prisma.participantMetrics.findMany({
      where: { roomId },
      orderBy: { stabilityScore: 'asc' }, // Lower is better
    });

    return metrics.map((m) => ({
      userId: m.userId,
      avgLatencyMs: m.avgLatencyMs,
      packetLossPercent: m.packetLossPercent,
      connectionUptime: Number(m.connectionUptime),
      stabilityScore: m.stabilityScore,
    }));
  }

  /**
   * Select the best host based on network stability
   */
  async selectBestHost(roomId: string): Promise<string | null> {
    const metrics = await this.getRoomMetrics(roomId);

    if (metrics.length === 0) {
      return null;
    }

    // Return user with lowest (best) stability score
    return metrics[0].userId;
  }

  /**
   * Get connection quality indicator for UI
   */
  getConnectionQuality(metrics: ParticipantMetrics): 'excellent' | 'good' | 'fair' | 'poor' {
    const { stabilityScore } = metrics;

    if (stabilityScore < 1.0) return 'excellent';
    if (stabilityScore < 2.0) return 'good';
    if (stabilityScore < 3.5) return 'fair';
    return 'poor';
  }

  /**
   * Update connection uptime
   */
  async updateUptime(roomId: string, userId: string, uptimeMs: number): Promise<void> {
    await this.updateMetrics(roomId, userId, {
      connectionUptime: uptimeMs,
    } as ParticipantMetrics);
  }

  /**
   * Delete metrics when user leaves room
   */
  async deleteMetrics(roomId: string, userId: string): Promise<void> {
    await prisma.participantMetrics.deleteMany({
      where: {
        roomId,
        userId,
      },
    });
  }
}
