/**
 * useDiagnosticsKeyboard Hook
 * Handles keyboard shortcut (Ctrl+Shift+D) for toggling diagnostics overlay
 */

import { useEffect } from 'react';
import { useDiagnosticsStore } from '../stores/diagnostics.store';

/**
 * Hook to handle diagnostics keyboard shortcuts
 *
 * Listens for Ctrl+Shift+D to toggle the diagnostics overlay
 */
export function useDiagnosticsKeyboard() {
  const toggleOverlay = useDiagnosticsStore((state) => state.toggleOverlay);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Shift+D (or Cmd+Shift+D on Mac)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        toggleOverlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleOverlay]);
}
