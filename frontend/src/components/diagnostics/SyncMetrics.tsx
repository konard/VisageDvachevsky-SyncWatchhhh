/**
 * SyncMetrics Component
 * Displays real-time sync metrics
 */

import { memo, useMemo } from 'react';
import { Activity } from 'lucide-react';
import { useDiagnosticsStore } from '../../stores/diagnostics.store';
import { MetricsSection } from './MetricsSection';
import { MetricRow } from './MetricRow';

export const SyncMetrics = memo(() => {
  const metrics = useDiagnosticsStore((state) => state.syncMetrics);
  const expanded = useDiagnosticsStore((state) => state.preferences.expandedSections.sync);
  const toggleSection = useDiagnosticsStore((state) => state.toggleSection);

  const getDriftStatus = (drift: number) => {
    const absDrift = Math.abs(drift);
    if (absDrift < 300) return 'good';
    if (absDrift < 1000) return 'warning';
    return 'error';
  };

  const getBufferHealthStatus = (health: number) => {
    if (health >= 0.8) return 'good';
    if (health >= 0.5) return 'warning';
    return 'error';
  };

  const formattedServerTime = useMemo(() => {
    if (!metrics) return '--:--:--';
    const date = new Date(metrics.serverTimeMs);
    return date.toLocaleTimeString();
  }, [metrics]);

  const formattedLocalTime = useMemo(() => {
    if (!metrics) return '--:--:--';
    const date = new Date(metrics.localTimeMs);
    return date.toLocaleTimeString();
  }, [metrics]);

  if (!metrics) {
    return (
      <MetricsSection
        title="Sync Metrics"
        icon={<Activity className="w-4 h-4" />}
        expanded={expanded}
        onToggle={() => toggleSection('sync')}
      >
        <div className="text-xs text-gray-500 text-center py-4">
          No sync data available
        </div>
      </MetricsSection>
    );
  }

  return (
    <MetricsSection
      title="Sync Metrics"
      icon={<Activity className="w-4 h-4" />}
      expanded={expanded}
      onToggle={() => toggleSection('sync')}
    >
      <MetricRow
        label="Server Time"
        value={formattedServerTime}
        status="neutral"
      />
      <MetricRow
        label="Local Time"
        value={formattedLocalTime}
        status="neutral"
      />
      <MetricRow
        label="Clock Offset"
        value={metrics.clockOffsetMs}
        unit="ms"
        status="neutral"
      />
      <MetricRow
        label="Current Drift"
        value={metrics.driftMs}
        unit="ms"
        status={getDriftStatus(metrics.driftMs)}
      />
      <MetricRow
        label="Buffer Health"
        value={(metrics.bufferHealth * 100).toFixed(0)}
        unit="%"
        status={getBufferHealthStatus(metrics.bufferHealth)}
      />
      <MetricRow
        label="Playback Rate"
        value={metrics.playbackRate.toFixed(2)}
        unit="x"
        status={metrics.playbackRate !== 1.0 ? 'warning' : 'good'}
      />
    </MetricsSection>
  );
});

SyncMetrics.displayName = 'SyncMetrics';
