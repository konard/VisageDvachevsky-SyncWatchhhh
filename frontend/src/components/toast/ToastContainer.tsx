import { AnimatePresence } from 'framer-motion';
import { useToastStore } from './ToastStore';
import { Toast } from './Toast';

/**
 * Toast Container Component
 * Renders all active toasts in a fixed position
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onClose={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
