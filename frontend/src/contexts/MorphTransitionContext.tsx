import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';

/**
 * Rect type for element positions
 */
export interface MorphRect {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
}

/**
 * Morph element registration info
 */
export interface MorphElement {
  id: string;
  ref: React.RefObject<HTMLElement>;
  getRect: () => MorphRect | null;
}

/**
 * Active morph transition state
 */
export interface ActiveMorph {
  sourceId: string;
  targetId: string;
  sourceRect: MorphRect;
  targetRect: MorphRect | null;
  isAnimating: boolean;
  progress: number;
}

/**
 * Morph transition context value
 */
interface MorphTransitionContextValue {
  // Register a morph element
  register: (id: string, ref: React.RefObject<HTMLElement>) => void;
  // Unregister a morph element
  unregister: (id: string) => void;
  // Start a morph transition from source to target
  startMorph: (sourceId: string, targetId: string) => void;
  // Complete the morph transition
  completeMorph: () => void;
  // Cancel the morph transition
  cancelMorph: () => void;
  // Get current active morph
  activeMorph: ActiveMorph | null;
  // Get rect for an element
  getElementRect: (id: string) => MorphRect | null;
  // Check if an element is morphing
  isMorphing: (id: string) => boolean;
  // Get source rect for current morph
  getSourceRect: () => MorphRect | null;
}

const MorphTransitionContext = createContext<MorphTransitionContextValue | null>(null);

/**
 * Get computed border radius from element
 */
function getBorderRadius(element: HTMLElement): number {
  const computed = window.getComputedStyle(element);
  const radius = parseFloat(computed.borderRadius);
  return isNaN(radius) ? 0 : radius;
}

/**
 * Get element rect with border radius
 */
function getElementRect(element: HTMLElement): MorphRect {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    borderRadius: getBorderRadius(element),
  };
}

interface MorphTransitionProviderProps {
  children: ReactNode;
}

/**
 * MorphTransitionProvider - Manages shared element morph transitions
 *
 * Implements FLIP (First, Last, Invert, Play) animation technique for
 * smooth morphing between glass elements.
 */
export function MorphTransitionProvider({ children }: MorphTransitionProviderProps) {
  const elementsRef = useRef<Map<string, MorphElement>>(new Map());
  const [activeMorph, setActiveMorph] = useState<ActiveMorph | null>(null);

  const register = useCallback((id: string, ref: React.RefObject<HTMLElement>) => {
    elementsRef.current.set(id, {
      id,
      ref,
      getRect: () => {
        if (ref.current) {
          return getElementRect(ref.current);
        }
        return null;
      },
    });
  }, []);

  const unregister = useCallback((id: string) => {
    elementsRef.current.delete(id);
  }, []);

  const getElementRectById = useCallback((id: string): MorphRect | null => {
    const element = elementsRef.current.get(id);
    if (element) {
      return element.getRect();
    }
    return null;
  }, []);

  const startMorph = useCallback((sourceId: string, targetId: string) => {
    const sourceRect = getElementRectById(sourceId);
    if (!sourceRect) {
      console.warn(`MorphTransition: Source element "${sourceId}" not found`);
      return;
    }

    // Target may not be rendered yet, so we allow null
    const targetRect = getElementRectById(targetId);

    setActiveMorph({
      sourceId,
      targetId,
      sourceRect,
      targetRect,
      isAnimating: true,
      progress: 0,
    });
  }, [getElementRectById]);

  const completeMorph = useCallback(() => {
    setActiveMorph((prev) => {
      if (prev) {
        return { ...prev, isAnimating: false, progress: 1 };
      }
      return null;
    });

    // Clear after animation completes
    setTimeout(() => {
      setActiveMorph(null);
    }, 50);
  }, []);

  const cancelMorph = useCallback(() => {
    setActiveMorph(null);
  }, []);

  const isMorphing = useCallback((id: string): boolean => {
    if (!activeMorph) return false;
    return activeMorph.sourceId === id || activeMorph.targetId === id;
  }, [activeMorph]);

  const getSourceRect = useCallback((): MorphRect | null => {
    return activeMorph?.sourceRect ?? null;
  }, [activeMorph]);

  const value: MorphTransitionContextValue = {
    register,
    unregister,
    startMorph,
    completeMorph,
    cancelMorph,
    activeMorph,
    getElementRect: getElementRectById,
    isMorphing,
    getSourceRect,
  };

  return (
    <MorphTransitionContext.Provider value={value}>
      {children}
    </MorphTransitionContext.Provider>
  );
}

/**
 * Hook to access morph transition context
 */
export function useMorphTransitionContext(): MorphTransitionContextValue {
  const context = useContext(MorphTransitionContext);
  if (!context) {
    throw new Error('useMorphTransitionContext must be used within a MorphTransitionProvider');
  }
  return context;
}

/**
 * Optional hook that returns null if not in provider
 */
export function useMorphTransitionContextOptional(): MorphTransitionContextValue | null {
  return useContext(MorphTransitionContext);
}
