import { useState } from 'react';
import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { GlassModal, GlassInput, GlassButton } from '../ui/glass';

interface ExternalURLModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
}

export function ExternalURLModal({ isOpen, onClose, onSubmit }: ExternalURLModalProps) {
  const [url, setUrl] = useState('');
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setValidationStatus('idle');
    setErrorMessage('');
  };

  const isValidUrl = (urlString: string): boolean => {
    try {
      const parsedUrl = new URL(urlString);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const isSupportedFormat = (urlString: string): boolean => {
    const lowerUrl = urlString.toLowerCase();
    return lowerUrl.endsWith('.m3u8') || lowerUrl.endsWith('.mp4') || lowerUrl.includes('.m3u8?') || lowerUrl.includes('.mp4?');
  };

  const handleValidate = () => {
    if (!url.trim()) {
      return;
    }

    // Check if valid URL
    if (!isValidUrl(url)) {
      setValidationStatus('invalid');
      setErrorMessage('Please enter a valid HTTP or HTTPS URL');
      return;
    }

    // Check if supported format
    if (!isSupportedFormat(url)) {
      setValidationStatus('invalid');
      setErrorMessage('URL must point to a .m3u8 (HLS) or .mp4 file');
      return;
    }

    // Validation passed
    setValidationStatus('valid');
    setErrorMessage('');
  };

  const handleSubmit = () => {
    if (validationStatus === 'valid') {
      onSubmit(url);
      handleClose();
    }
  };

  const handleClose = () => {
    setUrl('');
    setValidationStatus('idle');
    setErrorMessage('');
    onClose();
  };

  return (
    <GlassModal isOpen={isOpen} onClose={handleClose} title="Add External URL" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Enter a direct URL to a video file (MP4) or HLS stream (M3U8).
        </p>

        {/* URL Input */}
        <div className="space-y-2">
          <label className="block text-xs text-gray-500 uppercase tracking-wider">
            Video URL
          </label>
          <div className="flex gap-2">
            <GlassInput
              value={url}
              onChange={handleUrlChange}
              placeholder="https://example.com/video.m3u8"
              className="flex-1"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && url.trim()) {
                  handleValidate();
                }
              }}
            />
            <GlassButton
              onClick={handleValidate}
              disabled={!url.trim()}
              className="whitespace-nowrap"
            >
              Validate
            </GlassButton>
          </div>
        </div>

        {/* Validation Status */}
        {validationStatus === 'valid' && (
          <div className="p-4 glass-card rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Valid URL detected</span>
            </div>
            <p className="text-xs text-gray-400">
              {url.toLowerCase().endsWith('.m3u8') || url.toLowerCase().includes('.m3u8?')
                ? 'HLS stream detected - adaptive bitrate streaming'
                : 'MP4 video detected - direct playback'}
            </p>
          </div>
        )}

        {validationStatus === 'invalid' && errorMessage && (
          <div className="p-4 glass-card rounded-xl bg-red-500/10">
            <div className="flex items-start gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Validation Failed</p>
                <p className="text-xs text-gray-400 mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Supported Formats */}
        <div className="p-3 glass-card rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
            <ExternalLink className="w-4 h-4" />
            <span>Supported Formats</span>
          </div>
          <ul className="text-xs text-gray-400 space-y-1 ml-6 list-disc">
            <li>
              <span className="font-mono text-accent-cyan">.m3u8</span> - HLS streams (recommended)
            </li>
            <li>
              <span className="font-mono text-accent-cyan">.mp4</span> - Direct MP4 files
            </li>
          </ul>
        </div>

        {/* Warnings */}
        <div className="p-3 glass-card rounded-lg bg-yellow-500/10">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
            <div className="text-xs text-gray-400 space-y-1">
              <p className="text-yellow-400 font-medium">Important Notes:</p>
              <ul className="space-y-1 list-disc list-inside text-gray-500">
                <li>URL must be publicly accessible (no authentication)</li>
                <li>Server must allow CORS (Cross-Origin Resource Sharing)</li>
                <li>DRM-protected content is not supported</li>
                <li>Some sites block embedding - use file upload instead</li>
              </ul>
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
            disabled={validationStatus !== 'valid'}
            className="flex-1"
          >
            Add URL
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}
