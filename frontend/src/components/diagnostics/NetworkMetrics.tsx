/**
 * NetworkMetrics Component
 * Displays real-time network metrics
 */

import React, { memo } from 'react';
import { Wifi } from 'lucide-react';
import { useDiagnosticsStore } from '../../stores/diagnostics.store';
import { MetricsSection } from './MetricsSection';
import { MetricRow } from './MetricRow';

export const NetworkMetrics = memo(() => {
  const metrics = useDiagnosticsStore((state) => state.networkMetrics);
  const expanded = useDiagnosticsStore((state) => state.preferences.expandedSections.network);
  const toggleSection = useDiagnosticsStore((state) => state.toggleSection);

  const getLatencyStatus = (latency: number) => {
    if (latency < 50) return 'good';
    if (latency < 150) return 'warning';
    return 'error';
  };

  const getJitterStatus = (jitter: number) => {
    if (jitter < 10) return 'good';
    if (jitter < 30) return 'warning';
    return 'error';
  };

  const getPacketLossStatus = (loss: number) => {
    if (loss < 1) return 'good';
    if (loss < 5) return 'warning';
    return 'error';
  };

  if (!metrics) {
    return (
      <MetricsSection
        title="Network Metrics"
        icon={<Wifi className="w-4 h-4" />}
        expanded={expanded}
        onToggle={() => toggleSection('network')}
      >
        <div className="text-xs text-gray-500 text-center py-4">
          No network data available
        </div>
      </MetricsSection>
    );
  }

  return (
    <MetricsSection
      title="Network Metrics"
      icon={<Wifi className="w-4 h-4" />}
      expanded={expanded}
      onToggle={() => toggleSection('network')}
    >
      <MetricRow
        label="Latency"
        value={metrics.latencyMs}
        unit="ms"
        status={getLatencyStatus(metrics.latencyMs)}
      />
      <MetricRow
        label="Jitter"
        value={metrics.jitterMs}
        unit="ms"
        status={getJitterStatus(metrics.jitterMs)}
      />
      <MetricRow
        label="Packet Loss"
        value={metrics.packetLoss.toFixed(2)}
        unit="%"
        status={getPacketLossStatus(metrics.packetLoss)}
      />
    </MetricsSection>
  );
});

NetworkMetrics.displayName = 'NetworkMetrics';
