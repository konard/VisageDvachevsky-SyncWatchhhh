import { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle, FileVideo, X } from 'lucide-react';
import { GlassModal, GlassButton } from '../ui/glass';
import { apiClient } from '../../utils/api/apiClient';
import { useVideoSourceStore } from '../../stores';

interface UploadVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (videoId: string) => void;
}

const MAX_FILE_SIZE = 8 * 1024 * 1024 * 1024; // 8GB
const SUPPORTED_FORMATS = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
const SUPPORTED_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mkv'];

export function UploadVideoModal({ isOpen, onClose, onUploadComplete }: UploadVideoModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const setStoreUploadProgress = useVideoSourceStore((state) => state.setUploadProgress);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size of 8GB`,
      };
    }

    // Check file type
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      // Also check extension as fallback
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!SUPPORTED_EXTENSIONS.includes(extension)) {
        return {
          valid: false,
          error: `Unsupported file format. Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`,
        };
      }
    }

    return { valid: true };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setUploadSuccess(false);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await apiClient.post('/videos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(percentCompleted);

          // Update store with progress
          setStoreUploadProgress({
            uploadedBytes: progressEvent.loaded,
            totalBytes: progressEvent.total || 0,
            percentage: percentCompleted,
            isComplete: false,
          });
        },
      });

      const { videoId } = response.data;

      setUploadSuccess(true);
      setStoreUploadProgress({
        uploadedBytes: selectedFile.size,
        totalBytes: selectedFile.size,
        percentage: 100,
        isComplete: true,
      });

      // Wait a moment before calling completion callback
      setTimeout(() => {
        onUploadComplete(videoId);
        handleClose();
      }, 1000);
    } catch (error: any) {
      console.error('Upload failed:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
      setUploadError(errorMessage);
      setStoreUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      handleRemoveFile();
      onClose();
    }
  };

  return (
    <GlassModal isOpen={isOpen} onClose={handleClose} title="Upload Video" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Upload a video file to watch together. The video will be transcoded to HLS format.
        </p>

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_EXTENSIONS.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* File Selection Area */}
        {!selectedFile ? (
          <div
            onClick={handleBrowseClick}
            className="p-8 glass-card rounded-xl border-2 border-dashed border-white/20 hover:border-accent-cyan/50 transition-colors cursor-pointer"
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-accent-cyan/20 flex items-center justify-center">
                <Upload className="w-8 h-8 text-accent-cyan" />
              </div>
              <div>
                <p className="text-white font-medium">Click to browse</p>
                <p className="text-sm text-gray-400 mt-1">or drag and drop a video file</p>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Supported formats: {SUPPORTED_EXTENSIONS.join(', ')}</p>
                <p>Maximum size: 8 GB</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 glass-card rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-accent-cyan/20 flex items-center justify-center flex-shrink-0">
                <FileVideo className="w-6 h-6 text-accent-cyan" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  {!isUploading && (
                    <button
                      onClick={handleRemoveFile}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Uploading...</span>
                      <span className="text-accent-cyan font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-accent-cyan to-accent-blue rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Upload Success */}
                {uploadSuccess && (
                  <div className="mt-3 flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs">Upload complete! Processing...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {uploadError && (
          <div className="p-4 glass-card rounded-xl bg-red-500/10">
            <div className="flex items-start gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Upload Failed</p>
                <p className="text-xs text-gray-400 mt-1">{uploadError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="p-3 glass-card rounded-lg">
          <div className="text-xs text-gray-400 space-y-1">
            <p className="text-white font-medium mb-2">After upload:</p>
            <ul className="space-y-1 list-disc list-inside text-gray-500">
              <li>Video will be transcoded to HLS format</li>
              <li>Transcoding typically takes 1-3x video duration</li>
              <li>You&apos;ll see progress updates in real-time</li>
              <li>Video expires after 30 days</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <GlassButton
            variant="secondary"
            onClick={handleClose}
            disabled={isUploading}
            className="flex-1"
          >
            Cancel
          </GlassButton>
          <GlassButton
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || uploadSuccess}
            className="flex-1"
          >
            {isUploading ? 'Uploading...' : 'Upload & Transcode'}
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}
