/**
 * MetricRow Component
 * Displays a single metric with label and value
 */

import React, { memo } from 'react';
import clsx from 'clsx';

interface MetricRowProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: 'good' | 'warning' | 'error' | 'neutral';
  className?: string;
}

export const MetricRow = memo<MetricRowProps>(({
  label,
  value,
  unit,
  status = 'neutral',
  className,
}) => {
  const statusColors = {
    good: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    neutral: 'text-gray-300',
  };

  return (
    <div className={clsx('flex justify-between items-center', className)}>
      <span className="text-xs text-gray-400">{label}</span>
      <span className={clsx('text-sm font-mono', statusColors[status])}>
        {value}
        {unit && <span className="text-xs ml-1 opacity-70">{unit}</span>}
      </span>
    </div>
  );
});

MetricRow.displayName = 'MetricRow';
