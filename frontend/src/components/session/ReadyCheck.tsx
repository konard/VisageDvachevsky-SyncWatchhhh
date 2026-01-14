import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { ReadyCheck as ReadyCheckType } from '@syncwatch/shared';
import { GlassPanel } from '../ui/glass/GlassPanel';
import { GlassButton } from '../ui/glass/GlassButton';
import { CheckCircle, XCircle, Clock, Loader } from 'lucide-react';

interface ReadyCheckProps {
  check: ReadyCheckType;
  currentUserId: string;
  onRespond: (checkId: string, status: 'ready' | 'not_ready') => void;
}

/**
 * Ready Check Modal Component
 * Displays ready check UI and allows participants to respond
 */
export const ReadyCheck: React.FC<ReadyCheckProps> = ({ check, currentUserId, onRespond }) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(check.timeoutMs);
  const currentParticipant = check.participants.find(p => p.userId === currentUserId);
  const hasResponded = currentParticipant?.status !== 'pending';

  // Update countdown timer
  useEffect(() => {
    const elapsed = Date.now() - check.createdAt;
    const remaining = Math.max(0, check.timeoutMs - elapsed);
    setTimeRemaining(remaining);

    if (remaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      const newElapsed = Date.now() - check.createdAt;
      const newRemaining = Math.max(0, check.timeoutMs - newElapsed);
      setTimeRemaining(newRemaining);

      if (newRemaining <= 0) {
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [check.createdAt, check.timeoutMs]);

  const handleReady = () => {
    onRespond(check.checkId, 'ready');
  };

  const handleNotReady = () => {
    onRespond(check.checkId, 'not_ready');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'not_ready':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'timeout':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      default:
        return <Loader className="w-5 h-5 text-gray-400 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'text-green-400';
      case 'not_ready':
        return 'text-red-400';
      case 'timeout':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const progressPercentage = (timeRemaining / check.timeoutMs) * 100;
  const timeRemainingSeconds = Math.ceil(timeRemaining / 1000);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <GlassPanel className="w-full max-w-md p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Ready Check</h2>
          <p className="text-sm text-gray-300">
            Are you ready to start watching?
          </p>
        </div>

        {/* Timer Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Time Remaining</span>
            <span className="text-white font-mono">{timeRemainingSeconds}s</span>
          </div>
          <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
              initial={{ width: '100%' }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          </div>
        </div>

        {/* Participants List */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Participants
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {check.participants.map((participant) => (
              <motion.div
                key={participant.userId}
                layout
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 backdrop-blur-sm"
              >
                <span className={`text-sm font-medium ${
                  participant.userId === currentUserId ? 'text-cyan-400' : 'text-white'
                }`}>
                  {participant.username}
                  {participant.userId === currentUserId && ' (You)'}
                </span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(participant.status)}
                  <span className={`text-xs font-medium capitalize ${getStatusColor(participant.status)}`}>
                    {participant.status === 'pending' ? 'Waiting...' : participant.status.replace('_', ' ')}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        {!hasResponded && (
          <div className="flex gap-3">
            <GlassButton
              variant="success"
              className="flex-1"
              onClick={handleReady}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Ready
            </GlassButton>
            <GlassButton
              variant="danger"
              className="flex-1"
              onClick={handleNotReady}
            >
              <XCircle className="w-5 h-5 mr-2" />
              Not Ready
            </GlassButton>
          </div>
        )}

        {hasResponded && (
          <div className="text-center p-4 rounded-lg bg-white/5 backdrop-blur-sm">
            <p className="text-sm text-gray-300">
              Waiting for other participants...
            </p>
          </div>
        )}
      </GlassPanel>
    </motion.div>
  );
};
