import { useState } from 'react';
import { Play, AlertCircle, CheckCircle } from 'lucide-react';
import { GlassModal, GlassInput, GlassButton } from '../ui/glass';
import { extractYouTubeVideoId, getYouTubeThumbnailUrl, isValidYouTubeUrl } from '../../utils/youtube';

interface YouTubeSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (videoId: string, url: string) => void;
}

export function YouTubeSourceModal({ isOpen, onClose, onSubmit }: YouTubeSourceModalProps) {
  const [url, setUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [videoId, setVideoId] = useState<string | null>(null);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setValidationStatus('idle');
    setVideoId(null);
  };

  const handleValidate = () => {
    if (!url.trim()) {
      return;
    }

    setIsValidating(true);

    // Extract video ID
    const extractedId = extractYouTubeVideoId(url);

    if (extractedId) {
      setVideoId(extractedId);
      setValidationStatus('valid');
    } else {
      setVideoId(null);
      setValidationStatus('invalid');
    }

    setIsValidating(false);
  };

  const handleSubmit = () => {
    if (videoId) {
      onSubmit(videoId, url);
      handleClose();
    }
  };

  const handleClose = () => {
    setUrl('');
    setVideoId(null);
    setValidationStatus('idle');
    onClose();
  };

  return (
    <GlassModal isOpen={isOpen} onClose={handleClose} title="Add YouTube Video" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Paste a YouTube URL to watch together. Supports various YouTube URL formats.
        </p>

        {/* URL Input */}
        <div className="space-y-2">
          <label className="block text-xs text-gray-500 uppercase tracking-wider">
            YouTube URL
          </label>
          <div className="flex gap-2">
            <GlassInput
              value={url}
              onChange={handleUrlChange}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && url.trim()) {
                  handleValidate();
                }
              }}
            />
            <GlassButton
              onClick={handleValidate}
              disabled={!url.trim() || isValidating}
              className="whitespace-nowrap"
            >
              {isValidating ? 'Checking...' : 'Validate'}
            </GlassButton>
          </div>
        </div>

        {/* Validation Status */}
        {validationStatus === 'valid' && videoId && (
          <div className="p-4 glass-card rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Valid YouTube URL</span>
            </div>

            {/* Video Preview */}
            <div className="flex gap-3">
              <img
                src={getYouTubeThumbnailUrl(videoId, 'mq')}
                alt="Video thumbnail"
                className="w-32 h-24 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-video.png';
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300">
                  Video ID: <span className="font-mono text-accent-cyan">{videoId}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This video will be loaded using the official YouTube player API.
                </p>
              </div>
            </div>
          </div>
        )}

        {validationStatus === 'invalid' && (
          <div className="p-4 glass-card rounded-xl bg-red-500/10">
            <div className="flex items-start gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Invalid YouTube URL</p>
                <p className="text-xs text-gray-400 mt-1">
                  Please enter a valid YouTube URL. Supported formats:
                </p>
                <ul className="text-xs text-gray-500 mt-2 space-y-1 list-disc list-inside">
                  <li>https://www.youtube.com/watch?v=VIDEO_ID</li>
                  <li>https://youtu.be/VIDEO_ID</li>
                  <li>https://www.youtube.com/embed/VIDEO_ID</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="p-3 glass-card rounded-lg">
          <div className="flex items-start gap-2">
            <Play className="w-4 h-4 text-accent-cyan mt-0.5" />
            <div className="text-xs text-gray-400 space-y-1">
              <p>We use the official YouTube IFrame Player API for playback.</p>
              <p className="text-gray-500">
                • Some videos may have restrictions (age, region, embed disabled)
              </p>
              <p className="text-gray-500">• Sync precision: typically ±200-500ms</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <GlassButton variant="secondary" onClick={handleClose} className="flex-1">
            Cancel
          </GlassButton>
          <GlassButton
            onClick={handleSubmit}
            disabled={validationStatus !== 'valid' || !videoId}
            className="flex-1"
          >
            Add Video
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}
