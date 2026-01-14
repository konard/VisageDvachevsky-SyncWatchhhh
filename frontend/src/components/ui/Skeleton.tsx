import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Skeleton Loading Component
 * Provides loading state placeholders for better UX
 */
export function Skeleton({
  className,
  width,
  height,
  variant = 'rectangular',
  animation = 'pulse',
}: SkeletonProps) {
  const baseStyles = 'bg-white/10 backdrop-blur-sm';

  const variantStyles = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]',
    none: '',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={clsx(
        baseStyles,
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={style}
    />
  );
}

/**
 * Chat Message Skeleton
 */
export function ChatMessageSkeleton() {
  return (
    <div className="px-4 py-2 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton width={80} height={16} variant="text" />
        <Skeleton width={40} height={12} variant="text" />
      </div>
      <Skeleton width="90%" height={16} variant="text" />
    </div>
  );
}

/**
 * Video Player Skeleton
 */
export function VideoPlayerSkeleton() {
  return (
    <div className="w-full h-full bg-black/50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Skeleton width={120} height={120} variant="circular" className="mx-auto" />
        <Skeleton width={200} height={20} variant="text" className="mx-auto" />
        <Skeleton width={300} height={16} variant="text" className="mx-auto" />
      </div>
    </div>
  );
}

/**
 * Participant Card Skeleton
 */
export function ParticipantSkeleton() {
  return (
    <div className="glass-card p-3 flex items-center gap-3">
      <Skeleton width={40} height={40} variant="circular" />
      <div className="flex-1 space-y-2">
        <Skeleton width="60%" height={16} variant="text" />
        <Skeleton width="40%" height={12} variant="text" />
      </div>
    </div>
  );
}

/**
 * Room Page Skeleton (full page loading state)
 */
export function RoomPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <Skeleton width={200} height={32} variant="text" />
          <Skeleton width={100} height={40} variant="rectangular" />
        </div>

        {/* Video Player */}
        <Skeleton width="100%" height={500} variant="rectangular" />

        {/* Controls */}
        <div className="flex items-center gap-4 justify-center">
          <Skeleton width={60} height={60} variant="circular" />
          <Skeleton width={60} height={60} variant="circular" />
          <Skeleton width={60} height={60} variant="circular" />
        </div>

        {/* Chat/Participants */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <ChatMessageSkeleton />
            <ChatMessageSkeleton />
            <ChatMessageSkeleton />
          </div>
          <div className="space-y-2">
            <ParticipantSkeleton />
            <ParticipantSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
