/**
 * GlassColorContext - Context-aware color adaptation for Liquid Glass components
 *
 * This context provides dynamic color adaptation where glass elements pick up
 * and respond to colors from their environment, creating a "living" contextual appearance.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
  useRef,
} from 'react';

/**
 * RGB color representation
 */
interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * HSL color representation
 */
interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Glass color context value containing all adaptive color information
 */
export interface GlassColorContextValue {
  /** Dominant color sampled from background (CSS color string) */
  dominantColor: string;
  /** Brightness value from 0-1 (0=dark, 1=bright) */
  brightness: number;
  /** Accent color derived from dominant color */
  accentColor: string;
  /** Current color scheme preference (light/dark) */
  colorScheme: 'light' | 'dark';
  /** Whether color adaptation is enabled */
  enabled: boolean;
  /** Glass opacity based on brightness adaptation */
  glassOpacity: number;
  /** Glass background color with tint */
  glassBackground: string;
  /** Glass border color with tint */
  glassBorder: string;
  /** Glass glow color */
  glassGlow: string;
  /** Update dominant color from sampled element */
  setDominantColor: (color: string) => void;
  /** Update brightness manually */
  setBrightness: (brightness: number) => void;
  /** Toggle color adaptation */
  setEnabled: (enabled: boolean) => void;
  /** Override accent color */
  setAccentOverride: (color: string | null) => void;
  /** Sample colors from an element's background */
  sampleFromElement: (element: HTMLElement | null) => void;
}

/**
 * Default context values
 */
const defaultContextValue: GlassColorContextValue = {
  dominantColor: 'rgba(15, 23, 42, 1)', // slate-900
  brightness: 0.1,
  accentColor: '#00e5ff',
  colorScheme: 'dark',
  enabled: true,
  glassOpacity: 0.05,
  glassBackground: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassGlow: 'rgba(0, 229, 255, 0.3)',
  setDominantColor: () => {},
  setBrightness: () => {},
  setEnabled: () => {},
  setAccentOverride: () => {},
  sampleFromElement: () => {},
};

/**
 * GlassColorContext
 */
const GlassColorContext = createContext<GlassColorContextValue>(defaultContextValue);

/**
 * Props for GlassColorProvider
 */
interface GlassColorProviderProps {
  children: ReactNode;
  /** Initial enabled state */
  initialEnabled?: boolean;
  /** Sampling interval in ms (0 = manual only) */
  samplingInterval?: number;
  /** Element to sample from (defaults to document.body) */
  sampleTarget?: HTMLElement | null;
}

/**
 * Parse CSS color string to RGB values
 */
function parseColor(color: string): RGB | null {
  // Handle rgba/rgb format
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10),
      g: parseInt(rgbaMatch[2], 10),
      b: parseInt(rgbaMatch[3], 10),
    };
  }

  // Handle hex format
  const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16),
      g: parseInt(hexMatch[2], 16),
      b: parseInt(hexMatch[3], 16),
    };
  }

  // Handle short hex format
  const shortHexMatch = color.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i);
  if (shortHexMatch) {
    return {
      r: parseInt(shortHexMatch[1] + shortHexMatch[1], 16),
      g: parseInt(shortHexMatch[2] + shortHexMatch[2], 16),
      b: parseInt(shortHexMatch[3] + shortHexMatch[3], 16),
    };
  }

  return null;
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Calculate relative luminance of a color (for brightness)
 * Using WCAG 2.0 formula
 */
function calculateLuminance(rgb: RGB): number {
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Generate accent color from dominant color
 * Shifts hue and increases saturation for a vibrant accent
 */
function generateAccentColor(rgb: RGB): string {
  const hsl = rgbToHsl(rgb);

  // Shift hue by 30 degrees for a complementary feel
  const accentHsl: HSL = {
    h: (hsl.h + 30) % 360,
    s: Math.min(80, hsl.s + 30), // Increase saturation
    l: Math.max(50, Math.min(70, hsl.l)), // Clamp lightness
  };

  const accentRgb = hslToRgb(accentHsl);
  return `rgb(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b})`;
}

/**
 * Sample dominant color from canvas element
 * Uses a small sample area for efficiency
 */
function sampleDominantColor(canvas: HTMLCanvasElement): RGB | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const width = canvas.width;
  const height = canvas.height;

  // Sample a small grid of points for efficiency
  const sampleSize = 10;
  const stepX = Math.max(1, Math.floor(width / sampleSize));
  const stepY = Math.max(1, Math.floor(height / sampleSize));

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;

  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const idx = (y * width + x) * 4;
        totalR += data[idx];
        totalG += data[idx + 1];
        totalB += data[idx + 2];
        count++;
      }
    }

    if (count === 0) return null;

    return {
      r: Math.round(totalR / count),
      g: Math.round(totalG / count),
      b: Math.round(totalB / count),
    };
  } catch {
    // Canvas may be tainted by cross-origin content
    return null;
  }
}

/**
 * GlassColorProvider - Provides context-aware colors to glass components
 */
export function GlassColorProvider({
  children,
  initialEnabled = true,
  samplingInterval = 0,
  sampleTarget,
}: GlassColorProviderProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [dominantColor, setDominantColorState] = useState('rgba(15, 23, 42, 1)');
  const [brightness, setBrightnessState] = useState(0.1);
  const [accentOverride, setAccentOverride] = useState<string | null>(null);
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('dark');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number>(0);

  // Detect system color scheme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setColorScheme(e.matches ? 'dark' : 'light');
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Parse dominant color and calculate derived values
  const parsedColor = useMemo(() => parseColor(dominantColor), [dominantColor]);

  const calculatedBrightness = useMemo(() => {
    if (!parsedColor) return brightness;
    return calculateLuminance(parsedColor);
  }, [parsedColor, brightness]);

  const accentColor = useMemo(() => {
    if (accentOverride) return accentOverride;
    if (!parsedColor) return '#00e5ff';
    return generateAccentColor(parsedColor);
  }, [parsedColor, accentOverride]);

  // Calculate adaptive glass properties based on brightness and color scheme
  const glassProperties = useMemo(() => {
    const isDark = colorScheme === 'dark';
    const effectiveBrightness = enabled ? calculatedBrightness : (isDark ? 0.1 : 0.9);

    // Brightness adaptation:
    // - Lighter backgrounds → more opaque glass (0.1-0.15)
    // - Darker backgrounds → more transparent glass (0.03-0.08)
    const baseOpacity = isDark ? 0.05 : 0.1;
    const opacityRange = isDark ? 0.07 : 0.1;
    const glassOpacity = baseOpacity + effectiveBrightness * opacityRange;

    // Tint the glass background with dominant color
    const tintStrength = enabled ? 0.15 : 0;
    let bgR = 255, bgG = 255, bgB = 255;
    if (parsedColor && enabled) {
      bgR = Math.round(255 * (1 - tintStrength) + parsedColor.r * tintStrength);
      bgG = Math.round(255 * (1 - tintStrength) + parsedColor.g * tintStrength);
      bgB = Math.round(255 * (1 - tintStrength) + parsedColor.b * tintStrength);
    }

    const glassBackground = `rgba(${bgR}, ${bgG}, ${bgB}, ${glassOpacity.toFixed(3)})`;

    // Border adapts to brightness - more visible on darker backgrounds
    const borderOpacity = isDark
      ? 0.1 + (1 - effectiveBrightness) * 0.1
      : 0.15 + effectiveBrightness * 0.1;
    const glassBorder = `rgba(${bgR}, ${bgG}, ${bgB}, ${borderOpacity.toFixed(3)})`;

    // Parse accent color for glow
    const accentRgb = parseColor(accentColor);
    const glowR = accentRgb?.r ?? 0;
    const glowG = accentRgb?.g ?? 229;
    const glowB = accentRgb?.b ?? 255;
    const glassGlow = `rgba(${glowR}, ${glowG}, ${glowB}, 0.3)`;

    return {
      glassOpacity,
      glassBackground,
      glassBorder,
      glassGlow,
    };
  }, [calculatedBrightness, colorScheme, enabled, parsedColor, accentColor]);

  // Set dominant color with automatic brightness calculation
  const setDominantColor = useCallback((color: string) => {
    setDominantColorState(color);
    const rgb = parseColor(color);
    if (rgb) {
      setBrightnessState(calculateLuminance(rgb));
    }
  }, []);

  // Sample colors from an element
  const sampleFromElement = useCallback((element: HTMLElement | null) => {
    if (!element || !enabled) return;

    // Create canvas if needed
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const canvas = canvasRef.current;
    const rect = element.getBoundingClientRect();

    // Use small canvas for efficiency
    const scale = 0.1;
    canvas.width = Math.max(1, Math.floor(rect.width * scale));
    canvas.height = Math.max(1, Math.floor(rect.height * scale));

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Try to sample from computed background
    const computedStyle = window.getComputedStyle(element);
    const bgColor = computedStyle.backgroundColor;
    const bgImage = computedStyle.backgroundImage;

    // If element has a solid background color
    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
      const rgb = parseColor(bgColor);
      if (rgb) {
        setDominantColor(bgColor);
        return;
      }
    }

    // If element has a gradient background, sample from canvas
    if (bgImage && bgImage !== 'none') {
      ctx.fillStyle = bgColor || 'transparent';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Note: Parsing CSS gradients is complex; for now we sample the fill color
      // Future enhancement: parse gradient stops and calculate weighted average

      const sampled = sampleDominantColor(canvas);
      if (sampled) {
        setDominantColor(`rgb(${sampled.r}, ${sampled.g}, ${sampled.b})`);
      }
    }
  }, [enabled, setDominantColor]);

  // Set up periodic sampling if interval is provided
  useEffect(() => {
    if (samplingInterval <= 0 || !enabled) return;

    const target = sampleTarget || document.body;

    const sample = () => {
      sampleFromElement(target);
      frameRef.current = window.setTimeout(sample, samplingInterval);
    };

    sample();

    return () => {
      if (frameRef.current) {
        window.clearTimeout(frameRef.current);
      }
    };
  }, [samplingInterval, enabled, sampleTarget, sampleFromElement]);

  const contextValue = useMemo<GlassColorContextValue>(
    () => ({
      dominantColor,
      brightness: calculatedBrightness,
      accentColor,
      colorScheme,
      enabled,
      ...glassProperties,
      setDominantColor,
      setBrightness: setBrightnessState,
      setEnabled,
      setAccentOverride,
      sampleFromElement,
    }),
    [
      dominantColor,
      calculatedBrightness,
      accentColor,
      colorScheme,
      enabled,
      glassProperties,
      setDominantColor,
      sampleFromElement,
    ]
  );

  return (
    <GlassColorContext.Provider value={contextValue}>
      {children}
    </GlassColorContext.Provider>
  );
}

/**
 * useGlassColor - Hook to access glass color context
 */
export function useGlassColor(): GlassColorContextValue {
  return useContext(GlassColorContext);
}

/**
 * useColorScheme - Hook to detect system color scheme preference
 */
export function useColorScheme(): 'light' | 'dark' {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setColorScheme(e.matches ? 'dark' : 'light');
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return colorScheme;
}

/**
 * useLocalGlassColor - Hook for per-component color sampling
 *
 * This allows individual components to sample their local background
 * and override the global context colors.
 */
export function useLocalGlassColor(elementRef: React.RefObject<HTMLElement | null>) {
  const globalContext = useGlassColor();
  const [localColor, setLocalColor] = useState<string | null>(null);
  const [localBrightness, setLocalBrightness] = useState<number | null>(null);

  const sampleLocal = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;

    const parent = element.parentElement;
    if (!parent) return;

    const computedStyle = window.getComputedStyle(parent);
    const bgColor = computedStyle.backgroundColor;

    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
      setLocalColor(bgColor);
      const rgb = parseColor(bgColor);
      if (rgb) {
        setLocalBrightness(calculateLuminance(rgb));
      }
    }
  }, [elementRef]);

  // Sample on mount and when element changes
  useEffect(() => {
    sampleLocal();
  }, [sampleLocal]);

  return {
    dominantColor: localColor ?? globalContext.dominantColor,
    brightness: localBrightness ?? globalContext.brightness,
    accentColor: globalContext.accentColor,
    colorScheme: globalContext.colorScheme,
    enabled: globalContext.enabled,
    glassOpacity: globalContext.glassOpacity,
    glassBackground: globalContext.glassBackground,
    glassBorder: globalContext.glassBorder,
    glassGlow: globalContext.glassGlow,
    sampleLocal,
  };
}

export { GlassColorContext };
