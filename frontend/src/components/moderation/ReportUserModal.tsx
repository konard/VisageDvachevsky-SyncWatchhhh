import { useState } from 'react';
import { GlassModal } from '../ui/glass/GlassModal';
import { GlassButton } from '../ui/glass/GlassButton';
import { GlassInput } from '../ui/glass/GlassInput';

export interface ReportUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUsername: string;
  roomId: string;
  onSubmit: (data: ReportUserData) => Promise<void>;
}

export interface ReportUserData {
  reportedUserId: string;
  roomId: string;
  reason: ReportReason;
  description?: string;
}

export type ReportReason =
  | 'harassment'
  | 'inappropriate_content'
  | 'spam'
  | 'cheating'
  | 'hate_speech'
  | 'other';

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'spam', label: 'Spam' },
  { value: 'cheating', label: 'Cheating' },
  { value: 'hate_speech', label: 'Hate Speech' },
  { value: 'other', label: 'Other' },
];

export const ReportUserModal = ({
  isOpen,
  onClose,
  targetUserId,
  targetUsername,
  roomId,
  onSubmit,
}: ReportUserModalProps) => {
  const [reason, setReason] = useState<ReportReason>('harassment');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit({
        reportedUserId: targetUserId,
        roomId,
        reason,
        description: description.trim() || undefined,
      });

      // Reset form and close modal
      setReason('harassment');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Report User"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-gray-300 mb-4">
            Report <span className="font-semibold text-white">{targetUsername}</span> for violating community guidelines.
            Chat logs will be automatically captured as evidence.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            Reason <span className="text-red-400">*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as ReportReason)}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     backdrop-blur-sm transition-all"
            required
          >
            {REPORT_REASONS.map((r) => (
              <option key={r.value} value={r.value} className="bg-gray-800">
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            Additional Details (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide any additional context that may help moderators..."
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white
                     placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500
                     focus:border-transparent backdrop-blur-sm transition-all resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            {description.length}/500 characters
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <GlassButton
            type="button"
            onClick={onClose}
            variant="secondary"
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </GlassButton>
          <GlassButton
            type="submit"
            variant="primary"
            className="flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </GlassButton>
        </div>
      </form>
    </GlassModal>
  );
};
