import { Users, Crown, Mic, MicOff, MoreVertical } from 'lucide-react';
import clsx from 'clsx';
import { GlassAvatar } from '../ui/glass';

interface Participant {
  id: string;
  name: string;
  isOnline: boolean;
  isOwner?: boolean;
  isSpeaking?: boolean;
  isMuted?: boolean;
  avatar?: string;
}

interface ParticipantsListProps {
  className?: string;
}

/**
 * Participants List Component with liquid-glass styling
 * Displays list of room participants with status indicators
 */
export function ParticipantsList({ className }: ParticipantsListProps) {
  const participants: Participant[] = [
    { id: '1', name: 'Alice', isOnline: true, isOwner: true, isSpeaking: false, isMuted: false },
    { id: '2', name: 'Bob', isOnline: true, isSpeaking: true, isMuted: false },
    { id: '3', name: 'Charlie', isOnline: true, isSpeaking: false, isMuted: true },
    { id: '4', name: 'Diana', isOnline: false },
  ];

  const onlineCount = participants.filter((p) => p.isOnline).length;
  const sortedParticipants = [...participants].sort((a, b) => {
    // Owner first
    if (a.isOwner && !b.isOwner) return -1;
    if (!a.isOwner && b.isOwner) return 1;
    // Online before offline
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return 0;
  });

  return (
    <div className={clsx('', className)}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-accent-cyan" />
          <h3 className="text-sm font-medium text-white">Participants</h3>
          <span className="text-xs text-gray-500 ml-auto">
            {onlineCount}/{participants.length}
          </span>
        </div>

        {/* Participants list */}
        <div className="space-y-1">
          {sortedParticipants.map((participant) => (
            <ParticipantItem key={participant.id} participant={participant} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ParticipantItemProps {
  participant: Participant;
}

function ParticipantItem({ participant }: ParticipantItemProps) {
  const getStatusColor = () => {
    if (!participant.isOnline) return 'offline';
    if (participant.isSpeaking) return 'online';
    return 'online';
  };

  return (
    <div
      className={clsx(
        'group flex items-center gap-3 p-2 rounded-xl transition-all duration-200',
        participant.isOnline
          ? 'hover:bg-white/5 cursor-pointer'
          : 'opacity-50'
      )}
    >
      {/* Avatar with status */}
      <div className="relative">
        <GlassAvatar
          size="sm"
          src={participant.avatar}
          fallback={participant.name.slice(0, 2).toUpperCase()}
          status={getStatusColor()}
          isSpeaking={participant.isSpeaking}
        />
        {participant.isOwner && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center">
            <Crown className="w-2.5 h-2.5 text-yellow-900" />
          </div>
        )}
      </div>

      {/* Name and status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={clsx(
              'text-sm font-medium truncate',
              participant.isOnline ? 'text-white' : 'text-gray-400'
            )}
          >
            {participant.name}
          </span>
          {participant.isOwner && (
            <span className="text-xs text-yellow-500 font-medium">Host</span>
          )}
        </div>
        {participant.isOnline && (
          <span className="text-xs text-gray-500">
            {participant.isSpeaking
              ? 'Speaking'
              : participant.isMuted
              ? 'Muted'
              : 'Listening'}
          </span>
        )}
      </div>

      {/* Voice status icon */}
      {participant.isOnline && (
        <div className="flex items-center gap-1">
          {participant.isMuted ? (
            <MicOff className="w-4 h-4 text-red-400" />
          ) : participant.isSpeaking ? (
            <Mic className="w-4 h-4 text-green-400" />
          ) : (
            <Mic className="w-4 h-4 text-gray-500" />
          )}
        </div>
      )}

      {/* More options (shown on hover) */}
      <button
        className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200"
        aria-label="More options"
      >
        <MoreVertical className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}
