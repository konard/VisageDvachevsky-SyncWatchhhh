# Liquid Glass Design System

A comprehensive collection of glassmorphic UI components with liquid effects, designed to match the SyncWatch brand aesthetic.

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

## Components

### GlassCard

A foundational glass card component with shimmer hover effect.

```tsx
import { GlassCard } from '@/components/ui/glass';

<GlassCard padding="md">
  <h2>Card Title</h2>
  <p>Card content goes here</p>
</GlassCard>
```

**Props:**
- `padding?: 'none' | 'sm' | 'md' | 'lg'` - Card padding (default: 'md')
- `className?: string` - Additional CSS classes
- All standard div attributes

### GlassButton

A glass button with glow effects and multiple variants.

```tsx
import { GlassButton } from '@/components/ui/glass';

<GlassButton variant="default" size="md" onClick={handleClick}>
  Click me
</GlassButton>
```

**Props:**
- `variant?: 'default' | 'outline' | 'ghost'` - Button style variant (default: 'default')
- `size?: 'sm' | 'md' | 'lg'` - Button size (default: 'md')
- `fullWidth?: boolean` - Make button full width (default: false)
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
>
  Panel content
</GlassPanel>
```

**Props:**
- `header?: ReactNode` - Optional header content
- `footer?: ReactNode` - Optional footer content
- `padding?: 'none' | 'sm' | 'md' | 'lg'` - Panel padding (default: 'md')
- `className?: string` - Additional CSS classes

### GlassModal

An accessible modal dialog with animations and overlay.

```tsx
import { GlassModal } from '@/components/ui/glass';

const [isOpen, setIsOpen] = useState(false);

<GlassModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  size="md"
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

**Features:**
- ESC key to close
- Focus trap
- Scroll lock
- Smooth animations

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

## Animations

All components feature smooth animations:

- **Hover shimmer effect** - Subtle light sweep on hover
- **Focus glow pulse** - Cyan glow on focus
- **Press scale down** - Tactile feedback
- **Enter fade/slide** - Smooth entrance animations

## Accessibility

All components are built with accessibility in mind:

- **Keyboard navigation** - Full keyboard support
- **Screen reader support** - Proper ARIA labels and roles
- **Focus indicators** - Clear focus states
- **Semantic HTML** - Proper element usage

## Usage Example

```tsx
import {
  GlassCard,
  GlassButton,
  GlassInput,
  GlassModal,
  GlassAvatar,
} from '@/components/ui/glass';

function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <GlassCard>
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
      >
        Are you sure?
      </GlassModal>
    </GlassCard>
  );
}
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Backdrop blur support with fallbacks for older browsers

## License

MIT
