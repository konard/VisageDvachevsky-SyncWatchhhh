/**
 * SocketMetrics Component
 * Displays real-time socket connection metrics
 */

import React, { memo } from 'react';
import { Globe } from 'lucide-react';
import { useDiagnosticsStore } from '../../stores/diagnostics.store';
import { MetricsSection } from './MetricsSection';
import { MetricRow } from './MetricRow';

export const SocketMetrics = memo(() => {
  const metrics = useDiagnosticsStore((state) => state.socketMetrics);
  const expanded = useDiagnosticsStore((state) => state.preferences.expandedSections.socket);
  const toggleSection = useDiagnosticsStore((state) => state.toggleSection);

  const getSocketStatus = (state: string) => {
    if (state === 'connected') return 'good';
    if (state === 'reconnecting') return 'warning';
    return 'error';
  };

  if (!metrics) {
    return (
      <MetricsSection
        title="Socket Metrics"
        icon={<Globe className="w-4 h-4" />}
        expanded={expanded}
        onToggle={() => toggleSection('socket')}
      >
        <div className="text-xs text-gray-500 text-center py-4">
          No socket data available
        </div>
      </MetricsSection>
    );
  }

  return (
    <MetricsSection
      title="Socket Metrics"
      icon={<Globe className="w-4 h-4" />}
      expanded={expanded}
      onToggle={() => toggleSection('socket')}
    >
      <MetricRow
        label="Socket State"
        value={metrics.socketState}
        status={getSocketStatus(metrics.socketState)}
      />
      <MetricRow
        label="Reconnect Attempts"
        value={metrics.reconnectAttempts}
        status={metrics.reconnectAttempts === 0 ? 'good' : 'warning'}
      />
    </MetricsSection>
  );
});

SocketMetrics.displayName = 'SocketMetrics';
