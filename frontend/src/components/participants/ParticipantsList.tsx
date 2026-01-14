interface Participant {
  id: string;
  name: string;
  isOnline: boolean;
}

interface ParticipantsListProps {
  className?: string;
}

/**
 * Participants List Component
 * Displays list of room participants
 */
export function ParticipantsList({ className }: ParticipantsListProps) {
  const participants: Participant[] = [
    { id: '1', name: 'Alice', isOnline: true },
    { id: '2', name: 'Bob', isOnline: true },
    { id: '3', name: 'Charlie', isOnline: false },
  ];

  const onlineCount = participants.filter((p) => p.isOnline).length;

  return (
    <div className={className}>
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          Participants ({onlineCount} online)
        </h3>
        <div className="space-y-2">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  participant.isOnline ? 'bg-green-400' : 'bg-gray-500'
                }`}
              />
              <span className="text-sm text-gray-300">{participant.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
