'use client';

/**
 * LoadingSpinner Component
 *
 * Enterprise-grade loading indicator using the AYMUR Letter A logo.
 * Features smooth pulse animation with gold shimmer effect for a luxury feel.
 *
 * @module components/ui/LoadingSpinner
 */

import React from 'react';

import { cn } from '@/lib/utils/cn';

// =============================================================================
// TYPES
// =============================================================================

export interface LoadingSpinnerProps {
  /**
   * Size of the spinner
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large' | 'xlarge';

  /**
   * Display as full screen overlay with backdrop
   * @default false
   */
  fullScreen?: boolean;

  /**
   * Optional loading text to display below the spinner
   */
  text?: string;

  /**
   * Additional CSS classes
   */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SIZE_CLASSES = {
  small: 'w-6 h-6',
  medium: 'w-10 h-10',
  large: 'w-16 h-16',
  xlarge: 'w-24 h-24',
} as const;

const TEXT_SIZES = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
  xlarge: 'text-lg',
} as const;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * LoadingSpinner - Branded loading indicator
 *
 * Uses the AYMUR Letter A logo with a sophisticated pulse and shimmer animation.
 * Suitable for inline loading, section loading, and full-screen loading states.
 */
export function LoadingSpinner({
  size = 'medium',
  fullScreen = false,
  text,
  className,
}: LoadingSpinnerProps): React.JSX.Element {
  const spinner = (
    <div
      className={cn('flex flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-label={text || 'Loading'}
    >
      {/* Logo Container with Animations */}
      <div className={cn('relative', SIZE_CLASSES[size])}>
        {/* Glow effect layer */}
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            'animate-[glow_2s_ease-in-out_infinite]',
            'opacity-60'
          )}
          style={{
            background: 'radial-gradient(circle, rgba(201, 162, 39, 0.4) 0%, transparent 70%)',
            filter: 'blur(8px)',
          }}
          aria-hidden="true"
        />

        {/* Logo with pulse animation */}
        <img
          src="/images/AYMUR-Letter-A-Logo-and-webicon.png"
          alt=""
          className={cn(
            'relative w-full h-full object-contain',
            'animate-[pulse-logo_2s_ease-in-out_infinite]'
          )}
          aria-hidden="true"
        />

        {/* Shimmer overlay */}
        <div
          className={cn(
            'absolute inset-0 overflow-hidden rounded-full',
            'animate-[shimmer_2.5s_ease-in-out_infinite]'
          )}
          aria-hidden="true"
        >
          <div
            className="absolute inset-0 -translate-x-full"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(201, 162, 39, 0.3) 50%, transparent 100%)',
              animation: 'shimmer-sweep 2.5s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      {/* Loading text */}
      {text && (
        <span
          className={cn(
            'text-stone-500 font-medium tracking-wide',
            'animate-[fade-text_2s_ease-in-out_infinite]',
            TEXT_SIZES[size]
          )}
        >
          {text}
        </span>
      )}

      {/* Keyframe animations */}
      <style jsx>{`
        @keyframes pulse-logo {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.85;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
        }

        @keyframes glow {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.7;
          }
        }

        @keyframes shimmer-sweep {
          0% {
            transform: translateX(-100%);
          }
          50%,
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes fade-text {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );

  // Full screen variant with backdrop
  if (fullScreen) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50',
          'flex items-center justify-center',
          'bg-stone-50/80 backdrop-blur-sm'
        )}
      >
        {spinner}
      </div>
    );
  }

  return spinner;
}

// =============================================================================
// PRESET VARIANTS
// =============================================================================

/**
 * Inline loading spinner for buttons and small spaces
 */
export function LoadingSpinnerInline({ className }: { className?: string }): React.JSX.Element {
  return <LoadingSpinner size="small" className={className} />;
}

/**
 * Page section loading spinner
 */
export function LoadingSpinnerSection({
  text,
  className,
}: {
  text?: string;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('flex items-center justify-center py-12', className)}>
      <LoadingSpinner size="large" text={text} />
    </div>
  );
}

/**
 * Full page loading spinner with backdrop
 */
export function LoadingSpinnerFullPage({ text }: { text?: string }): React.JSX.Element {
  return <LoadingSpinner size="xlarge" fullScreen text={text} />;
}

/**
 * Card/container loading spinner
 */
export function LoadingSpinnerCard({
  text,
  className,
}: {
  text?: string;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('flex items-center justify-center py-8', className)}>
      <LoadingSpinner size="medium" text={text} />
    </div>
  );
}

export default LoadingSpinner;
