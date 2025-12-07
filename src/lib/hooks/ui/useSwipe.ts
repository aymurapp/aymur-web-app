'use client';

/**
 * useSwipe Hook
 *
 * A hook for detecting touch swipe gestures on mobile devices.
 * Supports horizontal and vertical swipe detection with configurable thresholds.
 *
 * Features:
 * - Horizontal swipe detection (left/right)
 * - Vertical swipe detection (up/down)
 * - Configurable minimum distance and velocity thresholds
 * - RTL-aware swipe direction
 * - Touch event handlers for binding to elements
 * - Optional prevention of scroll during swipe
 *
 * @example
 * // Basic usage
 * const { handlers, swipeDirection } = useSwipe({
 *   onSwipeLeft: () => console.log('Swiped left'),
 *   onSwipeRight: () => console.log('Swiped right'),
 * });
 *
 * return <div {...handlers}>Swipe me!</div>;
 *
 * @example
 * // With RTL support
 * const { handlers } = useSwipe({
 *   onSwipeStart: () => openDrawer(), // Swipe right in LTR, left in RTL
 *   onSwipeEnd: () => closeDrawer(),  // Swipe left in LTR, right in RTL
 *   respectRTL: true,
 * });
 */

import { useCallback, useRef, useState } from 'react';

import { useIsRTL } from './useLocale';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Swipe direction enum
 */
export type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;

/**
 * Swipe state during gesture
 */
export interface SwipeState {
  /** Whether a swipe is in progress */
  swiping: boolean;
  /** Current swipe direction */
  direction: SwipeDirection;
  /** Horizontal distance swiped (positive = right, negative = left) */
  deltaX: number;
  /** Vertical distance swiped (positive = down, negative = up) */
  deltaY: number;
  /** Current velocity (pixels per ms) */
  velocity: number;
  /** Swipe progress as percentage (0-1) based on threshold */
  progress: number;
}

/**
 * Configuration options for useSwipe
 */
export interface UseSwipeOptions {
  /**
   * Callback when swipe left is detected
   */
  onSwipeLeft?: () => void;

  /**
   * Callback when swipe right is detected
   */
  onSwipeRight?: () => void;

  /**
   * Callback when swipe up is detected
   */
  onSwipeUp?: () => void;

  /**
   * Callback when swipe down is detected
   */
  onSwipeDown?: () => void;

  /**
   * Callback when any swipe is detected
   * Called with the swipe direction
   */
  onSwipe?: (direction: SwipeDirection) => void;

  /**
   * Callback for logical "start" direction swipe
   * (Right in LTR, Left in RTL when respectRTL is true)
   */
  onSwipeStart?: () => void;

  /**
   * Callback for logical "end" direction swipe
   * (Left in LTR, Right in RTL when respectRTL is true)
   */
  onSwipeEnd?: () => void;

  /**
   * Callback during swipe (for drag gestures)
   * Called with current swipe state
   */
  onSwiping?: (state: SwipeState) => void;

  /**
   * Minimum distance (in pixels) required to trigger a swipe
   * @default 50
   */
  threshold?: number;

  /**
   * Minimum velocity (pixels/ms) required to trigger a swipe
   * @default 0.3
   */
  velocityThreshold?: number;

  /**
   * Whether to respect RTL direction for onSwipeStart/onSwipeEnd
   * @default false
   */
  respectRTL?: boolean;

  /**
   * Whether to track vertical swipes
   * @default false
   */
  trackVertical?: boolean;

  /**
   * Whether to prevent scroll during horizontal swipe
   * @default false
   */
  preventScrollOnSwipe?: boolean;

  /**
   * Whether the hook is disabled
   * @default false
   */
  disabled?: boolean;
}

/**
 * Return type for useSwipe hook
 */
export interface UseSwipeReturn {
  /**
   * Touch event handlers to spread on the element
   */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchCancel: () => void;
  };

  /**
   * Current swipe state
   */
  state: SwipeState;

  /**
   * Reset the swipe state
   */
  reset: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default minimum distance for swipe */
const DEFAULT_THRESHOLD = 50;

/** Default minimum velocity for swipe */
const DEFAULT_VELOCITY_THRESHOLD = 0.3;

/** Initial swipe state */
const INITIAL_STATE: SwipeState = {
  swiping: false,
  direction: null,
  deltaX: 0,
  deltaY: 0,
  velocity: 0,
  progress: 0,
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for detecting swipe gestures
 *
 * @param options Configuration options
 * @returns Swipe handlers and state
 */
export function useSwipe(options: UseSwipeOptions = {}): UseSwipeReturn {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipe,
    onSwipeStart,
    onSwipeEnd,
    onSwiping,
    threshold = DEFAULT_THRESHOLD,
    velocityThreshold = DEFAULT_VELOCITY_THRESHOLD,
    respectRTL = false,
    trackVertical = false,
    preventScrollOnSwipe = false,
    disabled = false,
  } = options;

  const isRTL = useIsRTL();

  // State for tracking swipe
  const [state, setState] = useState<SwipeState>(INITIAL_STATE);

  // Refs for tracking touch
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const lastTouchX = useRef<number>(0);
  const lastTouchY = useRef<number>(0);

  /**
   * Reset swipe state
   */
  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    touchStartX.current = 0;
    touchStartY.current = 0;
    touchStartTime.current = 0;
    lastTouchX.current = 0;
    lastTouchY.current = 0;
  }, []);

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) {
        return;
      }

      const touch = e.touches[0];
      if (!touch) {
        return;
      }
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      touchStartTime.current = Date.now();
      lastTouchX.current = touch.clientX;
      lastTouchY.current = touch.clientY;

      setState({
        ...INITIAL_STATE,
        swiping: true,
      });
    },
    [disabled]
  );

  /**
   * Handle touch move
   */
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || !state.swiping) {
        return;
      }

      const touch = e.touches[0];
      if (!touch) {
        return;
      }
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Update last touch position
      lastTouchX.current = touch.clientX;
      lastTouchY.current = touch.clientY;

      // Calculate velocity
      const elapsed = Date.now() - touchStartTime.current;
      const velocity = elapsed > 0 ? Math.max(absDeltaX, absDeltaY) / elapsed : 0;

      // Determine direction
      let direction: SwipeDirection = null;
      if (absDeltaX > absDeltaY && absDeltaX > 10) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else if (trackVertical && absDeltaY > absDeltaX && absDeltaY > 10) {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      // Calculate progress based on threshold
      const progress = Math.min(1, Math.max(absDeltaX, trackVertical ? absDeltaY : 0) / threshold);

      // Prevent scroll during horizontal swipe if configured
      if (preventScrollOnSwipe && direction && (direction === 'left' || direction === 'right')) {
        e.preventDefault();
      }

      const newState: SwipeState = {
        swiping: true,
        direction,
        deltaX,
        deltaY,
        velocity,
        progress,
      };

      setState(newState);
      onSwiping?.(newState);
    },
    [disabled, state.swiping, threshold, trackVertical, preventScrollOnSwipe, onSwiping]
  );

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback(
    (_e: React.TouchEvent) => {
      if (disabled || !state.swiping) {
        return;
      }

      const { deltaX, deltaY, velocity, direction } = state;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Check if swipe meets threshold requirements
      const meetsDistanceThreshold =
        Math.max(absDeltaX, trackVertical ? absDeltaY : 0) >= threshold;
      const meetsVelocityThreshold = velocity >= velocityThreshold;
      const isValidSwipe = meetsDistanceThreshold || meetsVelocityThreshold;

      if (isValidSwipe && direction) {
        // Call direction-specific callbacks
        switch (direction) {
          case 'left':
            onSwipeLeft?.();
            break;
          case 'right':
            onSwipeRight?.();
            break;
          case 'up':
            onSwipeUp?.();
            break;
          case 'down':
            onSwipeDown?.();
            break;
        }

        // Call generic swipe callback
        onSwipe?.(direction);

        // Call logical direction callbacks (RTL-aware)
        if (respectRTL) {
          const isStartDirection = isRTL ? direction === 'left' : direction === 'right';
          const isEndDirection = isRTL ? direction === 'right' : direction === 'left';

          if (isStartDirection) {
            onSwipeStart?.();
          } else if (isEndDirection) {
            onSwipeEnd?.();
          }
        }
      }

      // Reset state
      reset();
    },
    [
      disabled,
      state,
      threshold,
      velocityThreshold,
      trackVertical,
      respectRTL,
      isRTL,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      onSwipe,
      onSwipeStart,
      onSwipeEnd,
      reset,
    ]
  );

  /**
   * Handle touch cancel
   */
  const handleTouchCancel = useCallback(() => {
    reset();
  }, [reset]);

  // Build handlers object
  const handlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
  };

  return {
    handlers,
    state,
    reset,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useSwipe;
