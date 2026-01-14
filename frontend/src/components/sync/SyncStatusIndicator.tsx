import { Activity, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { usePlaybackStore } from '../../stores/playback.store';
import { clsx } from 'clsx';

/**
 * Props for SyncStatusIndicator component
 */
interface SyncStatusIndicatorProps {
  /** Whether to show detailed drift information */
  showDetails?: boolean;
  /** Custom CSS class */
  className?: string;
}

/**
 * Component that displays the current synchronization status
 * Shows an icon and optional drift information
 */
export function SyncStatusIndicator({
  showDetails = false,
  className,
}: SyncStatusIndicatorProps) {
  const { syncStatus, drift } = usePlaybackStore();

  // Determine icon and styling based on status
  const getStatusConfig = () => {
    switch (syncStatus) {
      case 'synced':
        return {
          icon: CheckCircle2,
          label: 'Synced',
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
        };
      case 'syncing':
        return {
          icon: Loader2,
          label: 'Syncing',
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          animate: true,
        };
      case 'drifted':
        return {
          icon: Activity,
          label: 'Out of Sync',
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
        };
      case 'error':
        return {
          icon: AlertCircle,
          label: 'Sync Error',
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
        };
      default:
        return {
          icon: Activity,
          label: 'Unknown',
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
        config.bgColor,
        config.color,
        className
      )}
    >
      <Icon
        className={clsx('w-4 h-4', config.animate && 'animate-spin')}
        aria-hidden="true"
      />
      <span>{config.label}</span>
      {showDetails && drift !== 0 && (
        <span className="text-xs opacity-75">
          ({drift > 0 ? '+' : ''}
          {drift.toFixed(0)}ms)
        </span>
      )}
    </div>
  );
}

/**
 * Compact version of the sync status indicator (icon only)
 */
export function SyncStatusIcon({ className }: { className?: string }) {
  const { syncStatus } = usePlaybackStore();

  const getStatusConfig = () => {
    switch (syncStatus) {
      case 'synced':
        return {
          icon: CheckCircle2,
          color: 'text-green-500',
          title: 'Synchronized',
        };
      case 'syncing':
        return {
          icon: Loader2,
          color: 'text-blue-500',
          animate: true,
          title: 'Synchronizing...',
        };
      case 'drifted':
        return {
          icon: Activity,
          color: 'text-yellow-500',
          title: 'Out of sync',
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          title: 'Sync error',
        };
      default:
        return {
          icon: Activity,
          color: 'text-gray-500',
          title: 'Unknown status',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div title={config.title} className="inline-block">
      <Icon
        className={clsx(
          'w-5 h-5',
          config.color,
          config.animate && 'animate-spin',
          className
        )}
        aria-label={config.title}
      />
    </div>
  );
}
