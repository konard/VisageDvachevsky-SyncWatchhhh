/**
 * YouTube utility functions
 * Handles video ID extraction and validation
 */

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    // Remove whitespace
    const trimmedUrl = url.trim();

    // Pattern 1: youtube.com/watch?v=VIDEO_ID
    const watchPattern = /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/;
    const watchMatch = trimmedUrl.match(watchPattern);
    if (watchMatch) {
      return watchMatch[1];
    }

    // Pattern 2: youtu.be/VIDEO_ID
    const shortPattern = /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const shortMatch = trimmedUrl.match(shortPattern);
    if (shortMatch) {
      return shortMatch[1];
    }

    // Pattern 3: youtube.com/embed/VIDEO_ID
    const embedPattern = /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
    const embedMatch = trimmedUrl.match(embedPattern);
    if (embedMatch) {
      return embedMatch[1];
    }

    // Pattern 4: youtube.com/v/VIDEO_ID
    const vPattern = /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/;
    const vMatch = trimmedUrl.match(vPattern);
    if (vMatch) {
      return vMatch[1];
    }

    // Pattern 5: m.youtube.com/watch?v=VIDEO_ID (mobile)
    const mobilePattern = /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/;
    const mobileMatch = trimmedUrl.match(mobilePattern);
    if (mobileMatch) {
      return mobileMatch[1];
    }

    // If it's already just a video ID (11 characters)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmedUrl)) {
      return trimmedUrl;
    }

    return null;
  } catch (error) {
    console.error('Error extracting YouTube video ID:', error);
    return null;
  }
}

/**
 * Validate if a string is a valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

/**
 * Get YouTube thumbnail URL for a video ID
 */
export function getYouTubeThumbnailUrl(videoId: string, quality: 'default' | 'hq' | 'mq' | 'sd' | 'maxres' = 'hq'): string {
  const qualityMap = {
    default: 'default',
    hq: 'hqdefault',
    mq: 'mqdefault',
    sd: 'sddefault',
    maxres: 'maxresdefault',
  };

  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}
