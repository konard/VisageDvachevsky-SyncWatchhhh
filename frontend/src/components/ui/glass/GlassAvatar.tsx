import { ImgHTMLAttributes, useState, forwardRef, CSSProperties, useMemo } from 'react';
import { clsx } from 'clsx';
import { useGlassColor } from '../../../contexts/GlassColorContext';

export interface GlassAvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size'> {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
  fallback?: string;
  className?: string;
  isSpeaking?: boolean;
  /** Override accent color */
  accentColor?: string;
  /** Disable all adaptive color features */
  staticColors?: boolean;
}

export const GlassAvatar = forwardRef<HTMLImageElement, GlassAvatarProps>(
  ({
    src,
    alt = 'Avatar',
    size = 'md',
    status,
    fallback,
    className,
    isSpeaking = false,
    accentColor,
    staticColors = false,
    ...props
  }, ref) => {
    const [imageError, setImageError] = useState(false);
    const glassColor = useGlassColor();

    // Use accent color from context or override
    const effectiveAccentColor = accentColor || glassColor.accentColor;
    const accentGlow = glassColor.glassGlow;
    const glassBorder = glassColor.glassBorder;

    const sizeClasses = {
      xs: 'w-8 h-8 text-xs',
      sm: 'w-10 h-10 text-sm',
      md: 'w-12 h-12 text-base',
      lg: 'w-16 h-16 text-lg',
      xl: 'w-24 h-24 text-2xl',
    };

    const statusColors = {
      online: 'bg-green-500',
      offline: 'bg-gray-500',
      away: 'bg-yellow-500',
      busy: 'bg-red-500',
    };

    const getInitials = (name?: string) => {
      if (!name) return '?';
      return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    // Parse accent color for styling
    const accentStyles = useMemo(() => {
      const match = effectiveAccentColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const [, r, g, b] = match;
        return {
          borderColor: `rgb(${r}, ${g}, ${b})`,
          gradient: `linear-gradient(to bottom right, rgba(${r}, ${g}, ${b}, 0.2), rgba(41, 121, 255, 0.2))`,
        };
      }
      return {
        borderColor: '#00e5ff',
        gradient: 'linear-gradient(to bottom right, rgba(0, 229, 255, 0.2), rgba(41, 121, 255, 0.2))',
      };
    }, [effectiveAccentColor]);

    const showImage = src && !imageError;

    // Build adaptive styles
    const containerStyle: CSSProperties = !staticColors ? {
      '--glass-background': glassColor.glassBackground,
      '--glass-border': glassBorder,
    } as CSSProperties : {};

    const speakingStyle: CSSProperties = isSpeaking && !staticColors ? {
      borderColor: accentStyles.borderColor,
      boxShadow: `0 0 10px ${accentGlow}`,
    } : {};

    const fallbackStyle: CSSProperties = !showImage && !staticColors ? {
      background: accentStyles.gradient,
    } : {};

    return (
      <div className={clsx('relative inline-block', sizeClasses[size], className)}>
        <div
          className={clsx(
            'w-full h-full rounded-full overflow-hidden',
            'glass-card border-2',
            isSpeaking
              ? staticColors
                ? 'speaking-glow border-accent-cyan'
                : ''
              : 'border-white/20',
            'transition-all duration-300'
          )}
          style={{ ...containerStyle, ...speakingStyle }}
        >
          {showImage ? (
            <img
              ref={ref}
              src={src}
              alt={alt}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              {...props}
            />
          ) : (
            <div
              className={clsx(
                'w-full h-full flex items-center justify-center text-white font-semibold',
                staticColors && 'bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20'
              )}
              style={fallbackStyle}
            >
              {fallback ? getInitials(fallback) : getInitials(alt)}
            </div>
          )}
        </div>
        {status && (
          <span
            className={clsx(
              'absolute bottom-0 right-0 block rounded-full border-2 border-slate-900',
              statusColors[status]
            )}
            style={{
              width: size === 'xs' || size === 'sm' ? '8px' : '12px',
              height: size === 'xs' || size === 'sm' ? '8px' : '12px',
            }}
            aria-label={`Status: ${status}`}
          />
        )}
      </div>
    );
  }
);

GlassAvatar.displayName = 'GlassAvatar';
