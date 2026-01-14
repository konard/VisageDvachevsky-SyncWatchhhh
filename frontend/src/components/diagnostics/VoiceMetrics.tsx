/**
 * VoiceMetrics Component
 * Displays real-time voice metrics
 */

import { memo } from 'react';
import { Mic } from 'lucide-react';
import { useDiagnosticsStore } from '../../stores/diagnostics.store';
import { MetricsSection } from './MetricsSection';
import { MetricRow } from './MetricRow';

export const VoiceMetrics = memo(() => {
  const metrics = useDiagnosticsStore((state) => state.voiceMetrics);
  const expanded = useDiagnosticsStore((state) => state.preferences.expandedSections.voice);
  const toggleSection = useDiagnosticsStore((state) => state.toggleSection);

  const getConnectionStatus = (state: string) => {
    if (state === 'connected') return 'good';
    if (state === 'connecting') return 'warning';
    return 'error';
  };

  if (!metrics) {
    return (
      <MetricsSection
        title="Voice Metrics"
        icon={<Mic className="w-4 h-4" />}
        expanded={expanded}
        onToggle={() => toggleSection('voice')}
      >
        <div className="text-xs text-gray-500 text-center py-4">
          No voice data available
        </div>
      </MetricsSection>
    );
  }

  return (
    <MetricsSection
      title="Voice Metrics"
      icon={<Mic className="w-4 h-4" />}
      expanded={expanded}
      onToggle={() => toggleSection('voice')}
    >
      <MetricRow
        label="Connection State"
        value={metrics.connectionState}
        status={getConnectionStatus(metrics.connectionState)}
      />
      <MetricRow
        label="Audio Level"
        value={(metrics.audioLevel * 100).toFixed(0)}
        unit="%"
        status="neutral"
      />
      <MetricRow
        label="ICE State"
        value={metrics.iceState}
        status={metrics.iceState === 'connected' ? 'good' : 'warning'}
      />
    </MetricsSection>
  );
});

VoiceMetrics.displayName = 'VoiceMetrics';
