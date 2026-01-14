import { useState } from 'react';
import {
  Users,
  Lock,
  Play,
  Crown,
  Eye,
  EyeOff,
  Settings2,
  ArrowRight,
} from 'lucide-react';
import { GlassModal, GlassButton, GlassInput } from '../ui/glass';
import clsx from 'clsx';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (options: RoomOptions) => void;
}

export interface RoomOptions {
  name: string;
  maxParticipants: 2 | 3 | 4 | 5;
  password?: string;
  playbackControl: 'owner_only' | 'all' | 'selected';
}

type PlaybackControlOption = {
  value: RoomOptions['playbackControl'];
  label: string;
  description: string;
  icon: React.ReactNode;
};

const playbackControlOptions: PlaybackControlOption[] = [
  {
    value: 'owner_only',
    label: 'Owner Only',
    description: 'Only you can control playback',
    icon: <Crown className="w-5 h-5" />,
  },
  {
    value: 'all',
    label: 'Everyone',
    description: 'All participants can control playback',
    icon: <Users className="w-5 h-5" />,
  },
  {
    value: 'selected',
    label: 'Selected',
    description: 'Choose who can control playback',
    icon: <Settings2 className="w-5 h-5" />,
  },
];

const participantOptions: { value: 2 | 3 | 4 | 5; label: string }[] = [
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
];

/**
 * Create Room Modal - Room configuration with liquid-glass styling
 */
export function CreateRoomModal({
  isOpen,
  onClose,
  onCreateRoom,
}: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<2 | 3 | 4 | 5>(5);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [playbackControl, setPlaybackControl] =
    useState<RoomOptions['playbackControl']>('owner_only');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      await onCreateRoom({
        name: roomName || 'My Room',
        maxParticipants,
        password: usePassword && password ? password : undefined,
        playbackControl,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    // Reset form on close
    setRoomName('');
    setMaxParticipants(5);
    setPassword('');
    setShowPassword(false);
    setUsePassword(false);
    setPlaybackControl('owner_only');
    onClose();
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Room"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Room Name */}
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
            Room Name (optional)
          </label>
          <GlassInput
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="My Watch Party"
            maxLength={50}
          />
        </div>

        {/* Max Participants */}
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
            Maximum Participants
          </label>
          <div className="flex gap-2">
            {participantOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMaxParticipants(option.value)}
                className={clsx(
                  'flex-1 py-3 rounded-xl font-medium text-sm transition-all duration-200',
                  maxParticipants === option.value
                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                )}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Playback Control */}
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
            Playback Control
          </label>
          <div className="space-y-2">
            {playbackControlOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPlaybackControl(option.value)}
                className={clsx(
                  'w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 text-left',
                  playbackControl === option.value
                    ? 'bg-accent-cyan/10 border border-accent-cyan/50'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                )}
              >
                <div
                  className={clsx(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    playbackControl === option.value
                      ? 'bg-accent-cyan/20 text-accent-cyan'
                      : 'bg-white/10 text-gray-400'
                  )}
                >
                  {option.icon}
                </div>
                <div className="flex-1">
                  <p
                    className={clsx(
                      'font-medium text-sm',
                      playbackControl === option.value
                        ? 'text-white'
                        : 'text-gray-300'
                    )}
                  >
                    {option.label}
                  </p>
                  <p className="text-xs text-gray-500">{option.description}</p>
                </div>
                <div
                  className={clsx(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    playbackControl === option.value
                      ? 'border-accent-cyan bg-accent-cyan'
                      : 'border-gray-500'
                  )}
                >
                  {playbackControl === option.value && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Password Protection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs text-gray-500 uppercase tracking-wider">
              Password Protection
            </label>
            <button
              type="button"
              onClick={() => {
                setUsePassword(!usePassword);
                if (usePassword) setPassword('');
              }}
              className={clsx(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                usePassword ? 'bg-accent-cyan' : 'bg-white/20'
              )}
            >
              <span
                className={clsx(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  usePassword ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
          {usePassword && (
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <GlassInput
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter room password"
                className="pl-12 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Create Button */}
        <GlassButton
          type="submit"
          className={clsx('w-full py-3', isCreating && 'opacity-70 cursor-wait')}
          disabled={isCreating}
        >
          {isCreating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating Room...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Play className="w-5 h-5" />
              Create Room
              <ArrowRight className="w-5 h-5" />
            </span>
          )}
        </GlassButton>
      </form>
    </GlassModal>
  );
}

export default CreateRoomModal;
