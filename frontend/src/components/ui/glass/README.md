# Liquid Glass Design System

A comprehensive collection of glassmorphic UI components with liquid effects, designed to match the SyncWatch brand aesthetic. Now with realistic optical glass effects including refraction, specular highlights, and edge effects.

## Design Tokens

### Colors
```css
--glass-bg: rgba(255, 255, 255, 0.05);
--glass-border: rgba(255, 255, 255, 0.1);
--glass-blur: blur(20px);
--accent-cyan: #00e5ff;
--accent-blue: #2979ff;
```

### Shadows
```css
--shadow-glass: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
--shadow-glow: 0 0 20px rgba(0, 229, 255, 0.3);
```

### Optical Effect Variables
```css
--glass-refraction-intensity: 0.5;
--glass-specular-intensity: 0.3;
--glass-specular-x: 50%;
--glass-specular-y: 30%;
```

## Optical Glass Effects

The glass components now support realistic optical effects that simulate physical glass properties:

### 1. Refraction Effect
Light bending as it passes through the glass surface, causing subtle distortion of background elements.

### 2. Specular Highlights
Dynamic highlights that respond to a virtual light source position. The light position can be:
- Tracked from mouse movement
- Based on scroll position
- Set manually via the context

### 3. Edge Effects
- **Edge Glow**: Subtle cyan accent glow at glass boundaries
- **Chromatic Aberration**: Very subtle rainbow color splitting at edges (like a prism)
- **Edge Highlights**: Light reflections on top and bottom edges

### 4. Thickness Variants
Glass components support three thickness levels that affect blur intensity and refraction:
- `thin`: 12px blur, subtle refraction
- `medium`: 20px blur, standard refraction (default)
- `thick`: 30px blur, strong refraction

## Setup

### Using GlassEffectsProvider (Recommended)

Wrap your app with `GlassEffectsProvider` to enable dynamic light tracking:

```tsx
import { GlassEffectsProvider, GlassSvgFilters } from '@/components/ui/glass';

function App() {
  return (
    <GlassEffectsProvider trackMouse trackScroll>
      {/* SVG filters must be included once in the DOM */}
      <GlassSvgFilters />

      {/* Your app content */}
      <YourApp />
    </GlassEffectsProvider>
  );
}
```

### Provider Options

```tsx
<GlassEffectsProvider
  trackMouse={true}        // Track mouse for dynamic light position
  trackScroll={true}       // Track scroll for specular highlights
  initialConfig={{
    refractionEnabled: true,
    refractionIntensity: 0.5,
    specularEnabled: true,
    specularIntensity: 0.6,
    chromaticAberrationEnabled: true,
    edgeGlowEnabled: true,
    reduceMotion: false,   // Auto-detected from system preference
  }}
>
  {children}
</GlassEffectsProvider>
```

### Without Provider

Glass components work without the provider using sensible defaults. Effects are still rendered but won't respond to mouse/scroll.

## Components

### GlassCard

A foundational glass card component with optical effects.

```tsx
import { GlassCard } from '@/components/ui/glass';

<GlassCard
  padding="md"
  thickness="medium"
  refraction
  specular
  edgeGlow
  chromaticAberration
>
  <h2>Card Title</h2>
  <p>Card content goes here</p>
</GlassCard>
```

**Props:**
- `padding?: 'none' | 'sm' | 'md' | 'lg'` - Card padding (default: 'md')
- `thickness?: 'thin' | 'medium' | 'thick'` - Glass thickness (default: 'medium')
- `refraction?: boolean` - Enable refraction effect (default: from config)
- `specular?: boolean` - Enable specular highlights (default: from config)
- `chromaticAberration?: boolean` - Enable color splitting at edges (default: from config)
- `edgeGlow?: boolean` - Enable edge glow effect (default: from config)
- `refractionIntensity?: number` - Override refraction intensity (0-1)
- `className?: string` - Additional CSS classes
- All standard div attributes

### GlassButton

A glass button with glow effects and multiple variants.

```tsx
import { GlassButton } from '@/components/ui/glass';

<GlassButton
  variant="default"
  size="md"
  onClick={handleClick}
  refraction
  specular
  edgeGlow
>
  Click me
</GlassButton>
```

**Props:**
- `variant?: 'default' | 'outline' | 'ghost' | 'primary' | 'secondary' | 'success' | 'danger'` - Button style
- `size?: 'sm' | 'md' | 'lg'` - Button size (default: 'md')
- `fullWidth?: boolean` - Make button full width (default: false)
- `refraction?: boolean` - Enable refraction on hover (default: true for 'default' variant)
- `specular?: boolean` - Enable specular highlights (default: true for 'default' variant)
- `edgeGlow?: boolean` - Enable edge glow (default: true for 'default' variant)
- `className?: string` - Additional CSS classes
- All standard button attributes

### GlassInput

A glass input field with focus glow effect.

```tsx
import { GlassInput } from '@/components/ui/glass';

<GlassInput
  label="Username"
  placeholder="Enter username"
  error={errors.username}
/>
```

**Props:**
- `label?: string` - Input label
- `error?: string` - Error message to display
- `className?: string` - Additional CSS classes
- All standard input attributes

### GlassPanel

A glass panel with optional header and footer sections.

```tsx
import { GlassPanel } from '@/components/ui/glass';

<GlassPanel
  header={<h2>Panel Title</h2>}
  footer={<button>Action</button>}
  padding="md"
  thickness="medium"
  refraction
  specular
  edgeGlow
>
  Panel content
</GlassPanel>
```

**Props:**
- `header?: ReactNode` - Optional header content
- `footer?: ReactNode` - Optional footer content
- `padding?: 'none' | 'sm' | 'md' | 'lg'` - Panel padding (default: 'md')
- `thickness?: 'thin' | 'medium' | 'thick'` - Glass thickness (default: 'medium')
- `refraction?: boolean` - Enable refraction effect
- `specular?: boolean` - Enable specular highlights
- `edgeGlow?: boolean` - Enable edge glow effect
- `className?: string` - Additional CSS classes

### GlassModal

An accessible modal dialog with optical effects and animations.

```tsx
import { GlassModal } from '@/components/ui/glass';

const [isOpen, setIsOpen] = useState(false);

<GlassModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  size="md"
  thickness="medium"
  refraction
  specular
  edgeGlow
>
  Modal content
</GlassModal>
```

**Props:**
- `isOpen: boolean` - Control modal visibility
- `onClose: () => void` - Close handler
- `title?: ReactNode` - Modal title
- `size?: 'sm' | 'md' | 'lg' | 'xl'` - Modal size (default: 'md')
- `closeOnOverlayClick?: boolean` - Close on overlay click (default: true)
- `showCloseButton?: boolean` - Show close button (default: true)
- `thickness?: 'thin' | 'medium' | 'thick'` - Glass thickness (default: 'medium')
- `refraction?: boolean` - Enable refraction effect
- `specular?: boolean` - Enable specular highlights
- `edgeGlow?: boolean` - Enable edge glow effect

**Features:**
- ESC key to close
- Focus trap
- Scroll lock
- Smooth animations
- Optical glass effects

### GlassDropdown

A dropdown select component with animations.

```tsx
import { GlassDropdown } from '@/components/ui/glass';

const options = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2', icon: <Icon /> },
  { value: '3', label: 'Option 3', disabled: true },
];

<GlassDropdown
  options={options}
  value={selected}
  onChange={setSelected}
  label="Select option"
/>
```

**Props:**
- `options: GlassDropdownOption[]` - Array of options
- `value?: string` - Selected value
- `onChange: (value: string) => void` - Change handler
- `placeholder?: string` - Placeholder text
- `label?: string` - Dropdown label
- `disabled?: boolean` - Disable dropdown

### GlassSlider

A range slider with glass styling.

```tsx
import { GlassSlider } from '@/components/ui/glass';

<GlassSlider
  label="Volume"
  min={0}
  max={100}
  value={volume}
  onChange={setVolume}
  showValue
  formatValue={(val) => `${val}%`}
/>
```

**Props:**
- `label?: string` - Slider label
- `min?: number` - Minimum value (default: 0)
- `max?: number` - Maximum value (default: 100)
- `step?: number` - Step increment (default: 1)
- `value?: number` - Current value
- `onChange?: (value: number) => void` - Change handler
- `showValue?: boolean` - Show value label (default: true)
- `formatValue?: (value: number) => string` - Value formatter

### GlassToggle

An animated toggle switch.

```tsx
import { GlassToggle } from '@/components/ui/glass';

<GlassToggle
  label="Enable notifications"
  description="Receive updates in real-time"
  checked={enabled}
  onChange={setEnabled}
/>
```

**Props:**
- `label?: string` - Toggle label
- `description?: string` - Helper text
- `checked?: boolean` - Toggle state
- `onChange?: (checked: boolean) => void` - Change handler
- `disabled?: boolean` - Disable toggle

### GlassAvatar

An avatar component with status indicator and speaking animation.

```tsx
import { GlassAvatar } from '@/components/ui/glass';

<GlassAvatar
  src="/avatar.jpg"
  alt="User Name"
  size="md"
  status="online"
  isSpeaking={false}
  fallback="UN"
/>
```

**Props:**
- `src?: string` - Avatar image URL
- `alt?: string` - Alt text (default: 'Avatar')
- `size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'` - Avatar size (default: 'md')
- `status?: 'online' | 'offline' | 'away' | 'busy'` - Status indicator
- `fallback?: string` - Fallback text for initials
- `isSpeaking?: boolean` - Speaking animation (default: false)

### GlassSpinner

A loading spinner with glass styling.

```tsx
import { GlassSpinner } from '@/components/ui/glass';

<GlassSpinner size="md" label="Loading..." />
```

**Props:**
- `size?: 'sm' | 'md' | 'lg' | 'xl'` - Spinner size (default: 'md')
- `label?: string` - Loading label

## Hooks

### useGlassEffects

Access the glass effects context from any component:

```tsx
import { useGlassEffects } from '@/components/ui/glass';

function MyComponent() {
  const {
    lightPosition,      // Current light position { x, y, z }
    setLightPosition,   // Manually set light position
    config,             // Current effects configuration
    updateConfig,       // Update configuration
    scrollProgress,     // Current scroll progress (0-1)
    isActive,           // Whether effects are active
  } = useGlassEffects();

  return (/* ... */);
}
```

## Performance

The optical effects are designed to be performant:

- **RAF Throttling**: Mouse and scroll updates are throttled using requestAnimationFrame
- **Page Visibility**: Effects pause when the page is not visible
- **CSS-only Animations**: Most effects use CSS for GPU-accelerated rendering
- **Conditional Rendering**: Effect overlays only render when enabled
- **Reduced Motion**: Full support for `prefers-reduced-motion` media query

### Performance Tips

1. Use `trackMouse={false}` if you don't need mouse-responsive highlights
2. Use `trackScroll={false}` if scroll-based effects aren't needed
3. For lists with many glass items, consider disabling effects on individual items
4. Use `thickness="thin"` for smaller elements to reduce blur cost

## Accessibility

All components are built with accessibility in mind:

- **Keyboard navigation** - Full keyboard support
- **Screen reader support** - Proper ARIA labels and roles
- **Focus indicators** - Clear focus states
- **Semantic HTML** - Proper element usage
- **Reduced motion** - Respects `prefers-reduced-motion` system preference
- **Graceful degradation** - Works on older browsers without effects

## Browser Support

- Chrome/Edge (latest) - Full support
- Firefox (latest) - Full support
- Safari (latest) - Full support
- Backdrop blur support with fallbacks for older browsers
- SVG filters may not work in IE11 (graceful degradation)

## Usage Example

```tsx
import {
  GlassEffectsProvider,
  GlassSvgFilters,
  GlassCard,
  GlassButton,
  GlassInput,
  GlassModal,
  GlassAvatar,
} from '@/components/ui/glass';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <GlassEffectsProvider>
      <GlassSvgFilters />

      <div className="animated-gradient min-h-screen p-8">
        <GlassCard thickness="medium" refraction specular edgeGlow>
          <div className="flex items-center gap-4 mb-4">
            <GlassAvatar
              src="/user.jpg"
              alt="John Doe"
              status="online"
            />
            <h2 className="text-xl font-bold">Welcome</h2>
          </div>

          <GlassInput
            label="Email"
            type="email"
            placeholder="Enter your email"
          />

          <GlassButton
            onClick={() => setIsModalOpen(true)}
            className="mt-4"
          >
            Open Modal
          </GlassButton>

          <GlassModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Confirmation"
            thickness="thick"
          >
            Are you sure?
          </GlassModal>
        </GlassCard>
      </div>
    </GlassEffectsProvider>
  );
}
```

## License

MIT
