/**
 * DriftTimeline Component
 * Visualizes drift over time with sync corrections
 */

import { memo, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useDiagnosticsStore } from '../../stores/diagnostics.store';
import { MetricsSection } from './MetricsSection';

export const DriftTimeline = memo(() => {
  const driftHistory = useDiagnosticsStore((state) => state.driftHistory);
  const expanded = useDiagnosticsStore((state) => state.preferences.expandedSections.timeline);
  const toggleSection = useDiagnosticsStore((state) => state.toggleSection);

  const chartData = useMemo(() => {
    return driftHistory.map((point) => ({
      time: new Date(point.timestamp).toLocaleTimeString(),
      drift: point.driftMs,
      correctionType: point.correctionType,
      isSoftCorrection: point.correctionType === 'soft',
      isHardCorrection: point.correctionType === 'hard',
    }));
  }, [driftHistory]);

  const stats = useMemo(() => {
    if (driftHistory.length === 0) {
      return { avg: 0, max: 0, min: 0, softCorrections: 0, hardCorrections: 0 };
    }

    const drifts = driftHistory.map((p) => p.driftMs);
    const sum = drifts.reduce((a, b) => a + b, 0);
    const softCorrections = driftHistory.filter((p) => p.correctionType === 'soft').length;
    const hardCorrections = driftHistory.filter((p) => p.correctionType === 'hard').length;

    return {
      avg: Math.round(sum / drifts.length),
      max: Math.max(...drifts),
      min: Math.min(...drifts),
      softCorrections,
      hardCorrections,
    };
  }, [driftHistory]);

  if (driftHistory.length === 0) {
    return (
      <MetricsSection
        title="Drift Timeline"
        icon={<TrendingUp className="w-4 h-4" />}
        expanded={expanded}
        onToggle={() => toggleSection('timeline')}
      >
        <div className="text-xs text-gray-500 text-center py-8">
          No drift history yet. Data will appear as you use the app.
        </div>
      </MetricsSection>
    );
  }

  return (
    <MetricsSection
      title="Drift Timeline"
      icon={<TrendingUp className="w-4 h-4" />}
      expanded={expanded}
      onToggle={() => toggleSection('timeline')}
    >
      <div className="space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-white/5 rounded px-2 py-1">
            <div className="text-gray-400">Avg Drift</div>
            <div className="text-white font-mono">{stats.avg}ms</div>
          </div>
          <div className="bg-white/5 rounded px-2 py-1">
            <div className="text-gray-400">Max Drift</div>
            <div className="text-red-400 font-mono">{stats.max}ms</div>
          </div>
          <div className="bg-white/5 rounded px-2 py-1">
            <div className="text-gray-400">Min Drift</div>
            <div className="text-green-400 font-mono">{stats.min}ms</div>
          </div>
        </div>

        {/* Corrections */}
        <div className="flex gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span className="text-gray-400">Soft: {stats.softCorrections}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <span className="text-gray-400">Hard: {stats.hardCorrections}</span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                label={{ value: 'Drift (ms)', angle: -90, position: 'insideLeft', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
              <ReferenceLine y={300} stroke="#eab308" strokeDasharray="2 2" label={{ value: 'Tolerance', fontSize: 10 }} />
              <ReferenceLine y={-300} stroke="#eab308" strokeDasharray="2 2" />
              <ReferenceLine y={1000} stroke="#ef4444" strokeDasharray="2 2" label={{ value: 'Hard Sync', fontSize: 10 }} />
              <ReferenceLine y={-1000} stroke="#ef4444" strokeDasharray="2 2" />
              <Line
                type="monotone"
                dataKey="drift"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="text-xs text-gray-400 space-y-1">
          <div>• Yellow lines: Soft sync threshold (±300ms)</div>
          <div>• Red lines: Hard sync threshold (±1000ms)</div>
        </div>
      </div>
    </MetricsSection>
  );
});

DriftTimeline.displayName = 'DriftTimeline';
