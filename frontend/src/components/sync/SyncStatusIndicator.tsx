import { Activity, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { usePlaybackStore } from '../../stores/playback.store';
import { clsx } from 'clsx';
import { SYNC_THRESHOLDS } from '@syncwatch/shared';

/**
 * Props for SyncStatusIndicator component
 */
interface SyncStatusIndicatorProps {
  /** Socket instance for resync functionality */
  socket?: Socket | null;
  /** Whether the socket is connected */
  isConnected?: boolean;
  /** Whether to show detailed drift information */
  showDetails?: boolean;
  /** Whether to show resync button when needed */
  showResyncButton?: boolean;
  /** Custom CSS class */
  className?: string;
}

/**
 * Component that displays the current synchronization status
 * Shows an icon and optional drift information
 */
export function SyncStatusIndicator({
  socket = null,
  isConnected = false,
  showDetails = false,
  showResyncButton = true,
  className,
}: SyncStatusIndicatorProps) {
  const { syncStatus, drift } = usePlaybackStore();

  // Determine if resync button should be shown
  const shouldShowResync = showResyncButton &&
    Math.abs(drift) > SYNC_THRESHOLDS.desynced &&
    isConnected;

  // Handle manual resync
  const handleResync = () => {
    if (socket && isConnected) {
      socket.emit('sync:resync', {});
    }
  };

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
    <div className={clsx('inline-flex items-center gap-2', className)}>
      <div
        className={clsx(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
          config.bgColor,
          config.color
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

      {shouldShowResync && (
        <button
          onClick={handleResync}
          className={clsx(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
            'bg-red-500/20 text-red-400 hover:bg-red-500/30',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-red-500/50'
          )}
          title="Manually resync with server"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Resync</span>
        </button>
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
