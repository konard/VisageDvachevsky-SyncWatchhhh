/**
 * MetricsSection Component
 * Collapsible section for displaying a group of metrics
 */

import React, { memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { GlassPanel } from '../ui/glass/GlassPanel';

interface MetricsSectionProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const MetricsSection = memo<MetricsSectionProps>(({
  title,
  icon,
  expanded,
  onToggle,
  children,
}) => {
  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-cyan-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-cyan-400" />
        )}
        <div className="text-cyan-400">{icon}</div>
        <span className="text-sm font-medium text-white">{title}</span>
      </button>

      {expanded && (
        <div className="mt-2 px-3 py-2 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
});

MetricsSection.displayName = 'MetricsSection';
