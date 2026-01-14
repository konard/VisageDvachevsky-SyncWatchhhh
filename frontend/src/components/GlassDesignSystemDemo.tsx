import { useState } from 'react';
import {
  GlassCard,
  GlassButton,
  GlassInput,
  GlassPanel,
  GlassModal,
  GlassDropdown,
  GlassSlider,
  GlassToggle,
  GlassAvatar,
  GlassSpinner,
  GlassDropdownOption,
} from './ui/glass';
import { AnimatedPage } from './AnimatedPage';

export const GlassDesignSystemDemo = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dropdownValue, setDropdownValue] = useState('');
  const [sliderValue, setSliderValue] = useState(50);
  const [toggleValue, setToggleValue] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const dropdownOptions: GlassDropdownOption[] = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' },
    { value: '4', label: 'Disabled Option', disabled: true },
  ];

  return (
    <AnimatedPage className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gradient mb-4">
            Liquid Glass Design System
          </h1>
          <p className="text-gray-300 text-lg">
            A complete collection of glassmorphic UI components
          </p>
        </div>

        {/* Cards Section */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">Cards & Panels</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard padding="lg">
              <h3 className="text-xl font-semibold text-white mb-2">Glass Card</h3>
              <p className="text-gray-300">
                A basic glass card with shimmer hover effect. Try hovering over this card!
              </p>
            </GlassCard>

            <GlassPanel
              header={<h3 className="text-xl font-semibold text-white">Glass Panel</h3>}
              footer={<p className="text-sm text-gray-400">Panel footer</p>}
            >
              <p className="text-gray-300">
                A panel with header and footer sections for organized content.
              </p>
            </GlassPanel>
          </div>
        </section>

        {/* Buttons Section */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">Buttons</h2>
          <GlassCard padding="lg">
            <div className="flex flex-wrap gap-4">
              <GlassButton variant="default" size="sm">
                Small Button
              </GlassButton>
              <GlassButton variant="default" size="md">
                Medium Button
              </GlassButton>
              <GlassButton variant="default" size="lg">
                Large Button
              </GlassButton>
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              <GlassButton variant="outline">
                Outline Button
              </GlassButton>
              <GlassButton variant="ghost">
                Ghost Button
              </GlassButton>
              <GlassButton disabled>
                Disabled Button
              </GlassButton>
            </div>
          </GlassCard>
        </section>

        {/* Inputs Section */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">Form Controls</h2>
          <GlassCard padding="lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassInput
                label="Username"
                placeholder="Enter username"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <GlassInput
                label="Email"
                type="email"
                placeholder="Enter email"
                error="This field is required"
              />

              <GlassDropdown
                label="Select Option"
                options={dropdownOptions}
                value={dropdownValue}
                onChange={setDropdownValue}
                placeholder="Choose an option"
              />

              <GlassSlider
                label="Volume"
                value={sliderValue}
                onChange={setSliderValue}
                min={0}
                max={100}
                formatValue={(val) => `${val}%`}
              />
            </div>

            <div className="mt-6 space-y-4">
              <GlassToggle
                label="Enable notifications"
                description="Receive real-time updates"
                checked={toggleValue}
                onChange={setToggleValue}
              />
              <GlassToggle
                label="Dark mode"
                description="Switch to dark theme"
                checked={true}
              />
              <GlassToggle
                label="Disabled toggle"
                description="This toggle is disabled"
                disabled
              />
            </div>
          </GlassCard>
        </section>

        {/* Avatars Section */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">Avatars</h2>
          <GlassCard padding="lg">
            <div className="flex flex-wrap items-end gap-6">
              <div className="text-center">
                <GlassAvatar size="xs" fallback="XS" status="online" />
                <p className="text-xs text-gray-400 mt-2">Extra Small</p>
              </div>
              <div className="text-center">
                <GlassAvatar size="sm" fallback="SM" status="away" />
                <p className="text-xs text-gray-400 mt-2">Small</p>
              </div>
              <div className="text-center">
                <GlassAvatar size="md" fallback="MD" status="busy" />
                <p className="text-xs text-gray-400 mt-2">Medium</p>
              </div>
              <div className="text-center">
                <GlassAvatar size="lg" fallback="LG" status="offline" />
                <p className="text-xs text-gray-400 mt-2">Large</p>
              </div>
              <div className="text-center">
                <GlassAvatar size="xl" fallback="XL" status="online" isSpeaking />
                <p className="text-xs text-gray-400 mt-2">Extra Large (Speaking)</p>
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Loading Spinners Section */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">Loading Spinners</h2>
          <GlassCard padding="lg">
            <div className="flex flex-wrap items-end gap-12">
              <GlassSpinner size="sm" />
              <GlassSpinner size="md" label="Loading..." />
              <GlassSpinner size="lg" />
              <GlassSpinner size="xl" />
            </div>
          </GlassCard>
        </section>

        {/* Modal Section */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">Modal</h2>
          <GlassCard padding="lg">
            <p className="text-gray-300 mb-4">
              Click the button below to open a modal dialog with smooth animations.
            </p>
            <GlassButton onClick={() => setIsModalOpen(true)}>
              Open Modal
            </GlassButton>

            <GlassModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              title="Example Modal"
              size="md"
            >
              <div className="space-y-4">
                <p className="text-gray-300">
                  This is a glass modal with smooth animations, backdrop blur, and full
                  accessibility support.
                </p>
                <p className="text-gray-400 text-sm">
                  Press ESC or click outside to close.
                </p>
                <div className="flex gap-3 justify-end pt-4">
                  <GlassButton variant="ghost" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </GlassButton>
                  <GlassButton onClick={() => setIsModalOpen(false)}>
                    Confirm
                  </GlassButton>
                </div>
              </div>
            </GlassModal>
          </GlassCard>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-400 text-sm pt-8">
          <p>Liquid Glass Design System - Built for SyncWatch</p>
        </footer>
      </div>
    </AnimatedPage>
  );
};
