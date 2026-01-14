import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

export interface LightPosition {
  x: number;
  y: number;
  z: number;
}

export interface GlassEffectsConfig {
  /** Enable refraction distortion effect */
  refractionEnabled: boolean;
  /** Refraction intensity (0-1) */
  refractionIntensity: number;
  /** Enable specular highlights */
  specularEnabled: boolean;
  /** Specular highlight intensity (0-1) */
  specularIntensity: number;
  /** Enable chromatic aberration at edges */
  chromaticAberrationEnabled: boolean;
  /** Enable edge glow effect */
  edgeGlowEnabled: boolean;
  /** Reduce motion for accessibility */
  reduceMotion: boolean;
}

export interface GlassEffectsContextValue {
  /** Current virtual light position (0-1 normalized) */
  lightPosition: LightPosition;
  /** Set light position manually */
  setLightPosition: (position: LightPosition) => void;
  /** Effects configuration */
  config: GlassEffectsConfig;
  /** Update effects configuration */
  updateConfig: (config: Partial<GlassEffectsConfig>) => void;
  /** Current scroll progress (0-1) */
  scrollProgress: number;
  /** Whether effects are currently active */
  isActive: boolean;
}

const defaultConfig: GlassEffectsConfig = {
  refractionEnabled: true,
  refractionIntensity: 0.5,
  specularEnabled: true,
  specularIntensity: 0.6,
  chromaticAberrationEnabled: true,
  edgeGlowEnabled: true,
  reduceMotion: false,
};

const GlassEffectsContext = createContext<GlassEffectsContextValue | null>(null);

export interface GlassEffectsProviderProps {
  children: ReactNode;
  /** Initial effects configuration */
  initialConfig?: Partial<GlassEffectsConfig>;
  /** Track mouse position for dynamic lighting */
  trackMouse?: boolean;
  /** Track scroll position for specular highlights */
  trackScroll?: boolean;
}

export function GlassEffectsProvider({
  children,
  initialConfig,
  trackMouse = true,
  trackScroll = true,
}: GlassEffectsProviderProps) {
  const [lightPosition, setLightPosition] = useState<LightPosition>({
    x: 0.5,
    y: 0.3,
    z: 1,
  });

  const [config, setConfig] = useState<GlassEffectsConfig>({
    ...defaultConfig,
    ...initialConfig,
  });

  const [scrollProgress, setScrollProgress] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setConfig((prev) => ({ ...prev, reduceMotion: e.matches }));
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Track mouse position for dynamic light
  useEffect(() => {
    if (!trackMouse || config.reduceMotion) return;

    let rafId: number;
    let lastX = 0;
    let lastY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position to 0-1
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;

      // Throttle updates using RAF
      if (Math.abs(x - lastX) > 0.01 || Math.abs(y - lastY) > 0.01) {
        lastX = x;
        lastY = y;

        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setLightPosition((prev) => ({
            ...prev,
            x,
            y,
          }));
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, [trackMouse, config.reduceMotion]);

  // Track scroll position for specular highlights
  useEffect(() => {
    if (!trackScroll || config.reduceMotion) return;

    let rafId: number;

    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollHeight > 0 ? window.scrollY / scrollHeight : 0;
        setScrollProgress(Math.min(1, Math.max(0, progress)));
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial value
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [trackScroll, config.reduceMotion]);

  // Check if page is visible for performance
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const updateConfig = useCallback((partial: Partial<GlassEffectsConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const value = useMemo<GlassEffectsContextValue>(
    () => ({
      lightPosition,
      setLightPosition,
      config,
      updateConfig,
      scrollProgress,
      isActive,
    }),
    [lightPosition, config, updateConfig, scrollProgress, isActive]
  );

  return (
    <GlassEffectsContext.Provider value={value}>
      {children}
    </GlassEffectsContext.Provider>
  );
}

export function useGlassEffectsContext(): GlassEffectsContextValue | null {
  return useContext(GlassEffectsContext);
}

/**
 * Hook to use glass effects with fallback defaults when provider is not present.
 * This allows glass components to work without requiring the provider.
 */
export function useGlassEffects(): GlassEffectsContextValue {
  const context = useContext(GlassEffectsContext);

  // Return sensible defaults if no provider
  if (!context) {
    return {
      lightPosition: { x: 0.5, y: 0.3, z: 1 },
      setLightPosition: () => {},
      config: defaultConfig,
      updateConfig: () => {},
      scrollProgress: 0,
      isActive: true,
    };
  }

  return context;
}
