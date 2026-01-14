import { useMediaQuery } from './useMediaQuery';

/**
 * Breakpoint sizes matching Tailwind config and issue requirements
 */
export const breakpoints = {
  sm: '640px',   // Mobile
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
} as const;

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Hook to get current breakpoint information
 */
export function useBreakpoint() {
  const isSm = useMediaQuery(`(min-width: ${breakpoints.sm})`);
  const isMd = useMediaQuery(`(min-width: ${breakpoints.md})`);
  const isLg = useMediaQuery(`(min-width: ${breakpoints.lg})`);
  const isXl = useMediaQuery(`(min-width: ${breakpoints.xl})`);

  // Determine current breakpoint
  const getCurrentBreakpoint = (): Breakpoint => {
    if (isXl) return 'xl';
    if (isLg) return 'lg';
    if (isMd) return 'md';
    if (isSm) return 'sm';
    return 'sm'; // Default to smallest
  };

  // Determine device type based on breakpoint
  const getDeviceType = (): DeviceType => {
    if (isLg) return 'desktop';
    if (isMd) return 'tablet';
    return 'mobile';
  };

  return {
    // Current breakpoint
    breakpoint: getCurrentBreakpoint(),

    // Device type
    deviceType: getDeviceType(),

    // Individual breakpoint checks
    isSm,
    isMd,
    isLg,
    isXl,

    // Device type booleans
    isMobile: !isMd,
    isTablet: isMd && !isLg,
    isDesktop: isLg,

    // Utility functions
    isAtLeast: (bp: Breakpoint): boolean => {
      const order = ['sm', 'md', 'lg', 'xl'];
      const currentIndex = order.indexOf(getCurrentBreakpoint());
      const targetIndex = order.indexOf(bp);
      return currentIndex >= targetIndex;
    },
    isAtMost: (bp: Breakpoint): boolean => {
      const order = ['sm', 'md', 'lg', 'xl'];
      const currentIndex = order.indexOf(getCurrentBreakpoint());
      const targetIndex = order.indexOf(bp);
      return currentIndex <= targetIndex;
    },
  };
}
