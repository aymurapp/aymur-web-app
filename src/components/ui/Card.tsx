'use client';

/**
 * Card Component
 *
 * An accessible, styled card wrapper around Ant Design Card with enhanced hover effects,
 * skeleton loading state support, and proper ARIA attributes.
 *
 * @example
 * // Basic usage
 * <Card title="My Card">Content here</Card>
 *
 * // With hover effect (interactive card)
 * <Card hoverable title="Clickable Card" onClick={handleClick}>Click me</Card>
 *
 * // With skeleton loading
 * <Card skeleton loading={isLoading} title="Loading Card">
 *   Content will show after loading
 * </Card>
 *
 * // As an article/section with proper semantics
 * <Card title="Product Details" role="article" aria-labelledby="product-title">
 *   <h3 id="product-title">Diamond Ring</h3>
 * </Card>
 */

import React, { forwardRef } from 'react';

import { Card as AntCard, Skeleton } from 'antd';

import { cn } from '@/lib/utils/cn';

import type { CardProps as AntCardProps } from 'antd';

/**
 * Extended Card props with skeleton and accessibility support
 */
export interface CardProps extends AntCardProps {
  /**
   * When true, shows a skeleton loading state instead of a spinner.
   * Works in conjunction with the loading prop.
   * @default false
   */
  skeleton?: boolean;

  /**
   * Number of skeleton paragraph rows when in skeleton mode.
   * @default 4
   */
  skeletonRows?: number;

  /**
   * Whether to show the skeleton avatar (circular element at top).
   * @default false
   */
  skeletonAvatar?: boolean;

  /**
   * Additional class names for custom styling
   */
  className?: string;

  /**
   * Enable enhanced hover effect with shadow and border highlight
   * @default false
   */
  hoverable?: boolean;

  /**
   * ARIA role for the card. Defaults to 'region' if title is provided.
   * Use 'article' for standalone content, 'listitem' when in a list.
   */
  role?: 'region' | 'article' | 'listitem' | 'group' | string;

  /**
   * Accessible label for the card (used when no visible title).
   */
  'aria-label'?: string;

  /**
   * ID of an element that labels this card (alternative to aria-label).
   */
  'aria-labelledby'?: string;

  /**
   * ID of an element that describes this card.
   */
  'aria-describedby'?: string;

  /**
   * Accessible description for loading state.
   * @default "Loading content"
   */
  loadingLabel?: string;
}

/**
 * Enhanced Card component with skeleton loading, hover effects, and accessibility
 *
 * Features:
 * - Skeleton loading state for better UX
 * - Enhanced hover effects with gold accent
 * - RTL-compatible styling
 * - Consistent with platform's luxury theme
 * - Proper ARIA attributes for screen readers
 * - Focus-visible styles for keyboard navigation
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      skeleton = false,
      skeletonRows = 4,
      skeletonAvatar = false,
      loading,
      hoverable = false,
      className,
      children,
      bodyStyle,
      title,
      role,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      loadingLabel = 'Loading content',
      ...props
    },
    ref
  ) => {
    // Build ARIA attributes
    const ariaAttributes: Record<string, unknown> = {};

    // Determine role - use 'region' for titled cards, allow override
    if (role) {
      ariaAttributes.role = role;
    } else if (title) {
      ariaAttributes.role = 'region';
    }

    // Handle labelling
    if (ariaLabel) {
      ariaAttributes['aria-label'] = ariaLabel;
    } else if (ariaLabelledBy) {
      ariaAttributes['aria-labelledby'] = ariaLabelledBy;
    } else if (title && typeof title === 'string') {
      // If title is a string, use it for aria-label
      ariaAttributes['aria-label'] = title;
    }

    if (ariaDescribedBy) {
      ariaAttributes['aria-describedby'] = ariaDescribedBy;
    }

    // Loading state accessibility
    if (loading) {
      ariaAttributes['aria-busy'] = true;
      ariaAttributes['aria-live'] = 'polite';
    }

    // Common card classes
    const cardClasses = cn(
      // Base card styles
      'overflow-hidden',
      // Border styling
      'border border-stone-200 dark:border-stone-700',
      // Background
      'bg-white dark:bg-stone-900',
      // Focus styles for keyboard navigation (when hoverable/clickable)
      hoverable && [
        'transition-all duration-300 ease-out',
        'hover:shadow-lg hover:shadow-amber-500/10',
        'hover:border-amber-300 dark:hover:border-amber-600',
        'hover:-translate-y-0.5',
        'cursor-pointer',
        // Focus-visible ring for keyboard users
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        'dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-stone-900',
      ],
      className
    );

    // Show skeleton loading state
    if (loading && skeleton) {
      return (
        <AntCard
          ref={ref}
          className={cardClasses}
          bodyStyle={bodyStyle}
          tabIndex={hoverable ? 0 : undefined}
          {...ariaAttributes}
          {...props}
        >
          {/* Screen reader announcement for loading */}
          <span className="sr-only" role="status" aria-live="polite">
            {loadingLabel}
          </span>
          <Skeleton
            active
            avatar={skeletonAvatar}
            paragraph={{ rows: skeletonRows }}
            aria-hidden="true"
          />
        </AntCard>
      );
    }

    return (
      <AntCard
        ref={ref}
        loading={loading}
        hoverable={hoverable}
        className={cardClasses}
        bodyStyle={bodyStyle}
        title={title}
        tabIndex={hoverable ? 0 : undefined}
        {...ariaAttributes}
        {...props}
      >
        {children}
      </AntCard>
    );
  }
);

Card.displayName = 'Card';

/**
 * Re-export Card.Meta and Card.Grid for convenience
 */
export const CardMeta = AntCard.Meta;
export const CardGrid = AntCard.Grid;

export default Card;
