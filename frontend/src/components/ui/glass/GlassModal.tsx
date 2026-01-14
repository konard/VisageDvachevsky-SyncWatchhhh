import { ReactNode, useEffect, useRef, useMemo, CSSProperties } from 'react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlassEffects } from './GlassEffectsProvider';
import { useGlassColor } from '../../../contexts/GlassColorContext';

export interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  /** Glass thickness affects refraction intensity */
  thickness?: 'thin' | 'medium' | 'thick';
  /** Enable refraction distortion effect */
  refraction?: boolean;
  /** Enable specular highlight effect */
  specular?: boolean;
  /** Enable edge glow effect */
  edgeGlow?: boolean;
  /** Override accent color */
  accentColor?: string;
  /** Disable all adaptive color features */
  staticColors?: boolean;
}

export const GlassModal = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
  thickness = 'medium',
  refraction,
  specular,
  edgeGlow,
  accentColor,
  staticColors = false,
}: GlassModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { lightPosition, config, isActive } = useGlassEffects();
  const glassColor = useGlassColor();

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  // Determine which effects to apply (prop overrides config)
  const enableRefraction = refraction ?? config.refractionEnabled;
  const enableSpecular = specular ?? config.specularEnabled;
  const enableEdgeGlow = edgeGlow ?? config.edgeGlowEnabled;
  const shouldAnimate = isActive && !config.reduceMotion;

  // Calculate refraction intensity based on thickness
  const thicknessIntensity = {
    thin: 0.3,
    medium: 0.5,
    thick: 0.7,
  };

  // Calculate specular highlight position
  const specularStyle = useMemo<CSSProperties>(() => {
    if (!enableSpecular || !shouldAnimate) return {};

    const intensity = config.specularIntensity * 0.35;
    return {
      '--glass-specular-x': `${lightPosition.x * 100}%`,
      '--glass-specular-y': `${lightPosition.y * 100}%`,
      '--glass-specular-intensity': intensity,
    } as CSSProperties;
  }, [enableSpecular, shouldAnimate, lightPosition, config.specularIntensity]);

  // Build adaptive CSS custom properties
  const adaptiveStyle: CSSProperties = staticColors ? {} : {
    '--glass-background': glassColor.glassBackground,
    '--glass-border': glassColor.glassBorder,
    '--glass-glow': glassColor.glassGlow,
    '--glass-accent-color': accentColor || glassColor.accentColor,
  } as CSSProperties;

  // Build effect classes
  const effectClasses = clsx(
    enableRefraction && shouldAnimate && 'glass-modal-refraction',
    enableSpecular && shouldAnimate && 'glass-modal-specular',
    enableEdgeGlow && 'glass-modal-edge-glow'
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          {/* Backdrop with subtle blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          {/* Modal container */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={clsx(
              'glass-card glass-modal relative z-10 w-full',
              effectClasses,
              sizeClasses[size],
              className
            )}
            style={{
              ...adaptiveStyle,
              ...specularStyle,
              '--glass-refraction-intensity': thicknessIntensity[thickness],
            } as CSSProperties}
            data-glass-thickness={thickness}
          >
            {/* Specular highlight overlay */}
            {enableSpecular && shouldAnimate && (
              <div
                className="glass-modal-specular-overlay"
                aria-hidden="true"
                style={{
                  '--specular-x': `${lightPosition.x * 100}%`,
                  '--specular-y': `${lightPosition.y * 100}%`,
                } as CSSProperties}
              />
            )}

            {/* Edge glow */}
            {enableEdgeGlow && <div className="glass-modal-edge-highlight" aria-hidden="true" />}

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-6 border-b border-white/10 relative z-10">
                {title && (
                  <h2 id="modal-title" className="text-xl font-semibold text-white">
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="ml-auto text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                    aria-label="Close modal"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-6 relative z-10">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
