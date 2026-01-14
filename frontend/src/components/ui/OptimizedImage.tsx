import { useState, useEffect, useRef, memo } from 'react';
import clsx from 'clsx';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  lazy?: boolean;
  placeholder?: string;
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Optimized Image Component
 * Features:
 * - Lazy loading with Intersection Observer
 * - WebP format support with fallback
 * - Loading placeholder/skeleton
 * - Error handling with fallback image
 * - Responsive sizing
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  lazy = true,
  placeholder,
  fallback,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [lazy, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Convert image src to WebP if supported
  const getOptimizedSrc = (originalSrc: string) => {
    // If browser supports WebP and the image is not already WebP
    if (supportsWebP() && !originalSrc.endsWith('.webp')) {
      // In production, you might have a CDN that converts images
      // For now, we'll just use the original src
      // Example: return originalSrc.replace(/\.(jpg|jpeg|png)$/, '.webp');
      return originalSrc;
    }
    return originalSrc;
  };

  const imgSrc = hasError && fallback ? fallback : getOptimizedSrc(src);

  return (
    <div
      className={clsx('relative overflow-hidden', className)}
      style={{ width, height }}
    >
      {/* Placeholder/Skeleton */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-white/10 animate-pulse flex items-center justify-center">
          {placeholder ? (
            <img src={placeholder} alt="" className="blur-sm scale-110" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer bg-[length:200%_100%]" />
          )}
        </div>
      )}

      {/* Actual Image */}
      {isInView && (
        <img
          ref={imgRef}
          src={imgSrc}
          alt={alt}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={clsx(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width, height }}
        />
      )}

      {/* Error State */}
      {hasError && !fallback && (
        <div className="absolute inset-0 bg-white/5 flex items-center justify-center text-gray-400 text-sm">
          Failed to load image
        </div>
      )}
    </div>
  );
});

// Check if browser supports WebP
let webpSupported: boolean | null = null;

function supportsWebP(): boolean {
  if (webpSupported !== null) return webpSupported;

  if (typeof window === 'undefined') return false;

  // Check for WebP support
  const canvas = document.createElement('canvas');
  if (canvas.getContext && canvas.getContext('2d')) {
    webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } else {
    webpSupported = false;
  }

  return webpSupported;
}
