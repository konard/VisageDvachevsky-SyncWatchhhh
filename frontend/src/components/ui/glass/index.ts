/**
 * Liquid Glass Design System Components
 *
 * A collection of glassmorphic UI components with liquid effects,
 * matching the SyncWatch brand aesthetic.
 *
 * Features:
 * - Refraction: Light bending through the glass surface
 * - Specular highlights: Dynamic highlights responding to light position
 * - Edge effects: Subtle glow and chromatic aberration at edges
 * - Accessibility: Reduced motion support for all effects
 */

export { GlassCard } from './GlassCard';
export type { GlassCardProps } from './GlassCard';

export { GlassButton } from './GlassButton';
export type { GlassButtonProps } from './GlassButton';

export { GlassInput } from './GlassInput';
export type { GlassInputProps } from './GlassInput';

export { GlassPanel } from './GlassPanel';
export type { GlassPanelProps } from './GlassPanel';

export { GlassModal } from './GlassModal';
export type { GlassModalProps } from './GlassModal';

export { GlassDropdown } from './GlassDropdown';
export type { GlassDropdownProps, GlassDropdownOption } from './GlassDropdown';

export { GlassSlider } from './GlassSlider';
export type { GlassSliderProps } from './GlassSlider';

export { GlassToggle } from './GlassToggle';
export type { GlassToggleProps } from './GlassToggle';

export { GlassAvatar } from './GlassAvatar';
export type { GlassAvatarProps } from './GlassAvatar';

export { GlassSpinner } from './GlassSpinner';
export type { GlassSpinnerProps } from './GlassSpinner';

// Optical effects system
export { GlassEffectsProvider, useGlassEffects, useGlassEffectsContext } from './GlassEffectsProvider';
export type {
  GlassEffectsProviderProps,
  GlassEffectsContextValue,
  GlassEffectsConfig,
  LightPosition,
} from './GlassEffectsProvider';

export { GlassSvgFilters } from './GlassSvgFilters';
export type { GlassSvgFiltersProps } from './GlassSvgFilters';
