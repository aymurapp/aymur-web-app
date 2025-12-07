'use client';

/**
 * Button Component
 *
 * A permission-aware, accessible button wrapper around Ant Design Button.
 * Supports optional permission checking, gold-themed hover effects,
 * ARIA attributes, keyboard navigation, and all standard Ant Design Button props.
 *
 * @example
 * // Basic usage
 * <Button type="primary">Click me</Button>
 *
 * // With permission check - button only renders if user has permission
 * <Button permission="orders.create">Create Order</Button>
 *
 * // With loading state
 * <Button loading={isSubmitting}>Submit</Button>
 *
 * // With keyboard shortcut hint
 * <Button keyboardShortcut="Ctrl+S">Save</Button>
 */

import React, { forwardRef } from 'react';

import { Button as AntButton, Tooltip } from 'antd';

import { usePermissions } from '@/lib/hooks/permissions';
import { cn } from '@/lib/utils/cn';

import type { ButtonProps as AntButtonProps } from 'antd';

/**
 * Extended Button props with permission and accessibility support
 */
export interface ButtonProps extends AntButtonProps {
  /**
   * Optional permission to check before rendering.
   * If provided and user lacks permission, button will not render.
   * Format: "resource.action" (e.g., "orders.create")
   */
  permission?: string;

  /**
   * If true, show a disabled button with tooltip when user lacks permission
   * instead of hiding the button entirely.
   * @default false
   */
  showDisabledOnNoPermission?: boolean;

  /**
   * Tooltip message when button is disabled due to lack of permission.
   * Only used when showDisabledOnNoPermission is true.
   */
  noPermissionTooltip?: string;

  /**
   * Keyboard shortcut hint to display (e.g., "Ctrl+S", "Esc").
   * Will be shown as a tooltip and announced to screen readers.
   */
  keyboardShortcut?: string;

  /**
   * Custom aria-label for the button.
   * Use when the button's visual content doesn't adequately describe its purpose.
   */
  'aria-label'?: string;

  /**
   * ID of an element that describes the button's purpose.
   */
  'aria-describedby'?: string;

  /**
   * Indicates if the button controls an expandable element.
   */
  'aria-expanded'?: boolean;

  /**
   * Indicates if the button is pressed (for toggle buttons).
   */
  'aria-pressed'?: boolean;

  /**
   * ID of the element controlled by this button.
   */
  'aria-controls'?: string;

  /**
   * Indicates if the button opens a popup menu.
   */
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
}

/**
 * Permission-aware, accessible Button component
 *
 * Wraps Ant Design Button with optional permission checking and enhanced
 * accessibility features including ARIA attributes and keyboard shortcut hints.
 * If a permission prop is provided, the button will only render
 * if the current user has that permission.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      permission,
      showDisabledOnNoPermission = false,
      noPermissionTooltip = 'You do not have permission to perform this action',
      keyboardShortcut,
      className,
      disabled,
      loading,
      children,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      'aria-expanded': ariaExpanded,
      'aria-pressed': ariaPressed,
      'aria-controls': ariaControls,
      'aria-haspopup': ariaHasPopup,
      ...props
    },
    ref
  ) => {
    const { can } = usePermissions();

    // Check permission if provided
    const hasPermission = permission ? can(permission) : true;

    // If no permission and not showing disabled state, don't render
    if (!hasPermission && !showDisabledOnNoPermission) {
      return null;
    }

    // Determine if button should be disabled
    const isDisabled = disabled || (!hasPermission && showDisabledOnNoPermission);

    // Build ARIA attributes object
    const ariaAttributes: Record<string, unknown> = {};

    // Add aria-label with keyboard shortcut if provided
    if (ariaLabel) {
      ariaAttributes['aria-label'] = keyboardShortcut
        ? `${ariaLabel} (${keyboardShortcut})`
        : ariaLabel;
    } else if (keyboardShortcut && typeof children === 'string') {
      ariaAttributes['aria-label'] = `${children} (${keyboardShortcut})`;
    }

    if (ariaDescribedBy) {
      ariaAttributes['aria-describedby'] = ariaDescribedBy;
    }
    if (ariaExpanded !== undefined) {
      ariaAttributes['aria-expanded'] = ariaExpanded;
    }
    if (ariaPressed !== undefined) {
      ariaAttributes['aria-pressed'] = ariaPressed;
    }
    if (ariaControls) {
      ariaAttributes['aria-controls'] = ariaControls;
    }
    if (ariaHasPopup) {
      ariaAttributes['aria-haspopup'] = ariaHasPopup;
    }

    // Set aria-busy when loading
    if (loading) {
      ariaAttributes['aria-busy'] = true;
    }

    // Set aria-disabled for disabled buttons (ensures screen readers announce state)
    if (isDisabled) {
      ariaAttributes['aria-disabled'] = true;
    }

    // Button with custom styling for RTL support, gold theme, and accessibility
    const button = (
      <AntButton
        ref={ref}
        disabled={isDisabled}
        loading={loading}
        className={cn(
          // Base styles with RTL-aware spacing
          'inline-flex items-center justify-center gap-2',
          // Gold hover enhancement for default buttons
          'hover:border-amber-400 hover:text-amber-600',
          // Enhanced focus-visible ring for accessibility (WCAG compliant)
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-white',
          'dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-stone-900',
          // Transition for smooth hover effects
          'transition-all duration-200',
          className
        )}
        {...ariaAttributes}
        {...props}
      >
        {children}
        {/* Keyboard shortcut badge - visually shown, not announced (redundant with aria-label) */}
        {keyboardShortcut && (
          <kbd
            className="ms-1 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium
                       bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400
                       rounded border border-stone-200 dark:border-stone-700"
            aria-hidden="true"
          >
            {keyboardShortcut}
          </kbd>
        )}
      </AntButton>
    );

    // Wrap with tooltip if showing disabled state due to no permission
    if (!hasPermission && showDisabledOnNoPermission) {
      return (
        <Tooltip title={noPermissionTooltip}>
          <span className="inline-block" role="presentation">
            {button}
          </span>
        </Tooltip>
      );
    }

    // Wrap with tooltip if keyboard shortcut is provided (for mouse users)
    if (keyboardShortcut && !isDisabled) {
      return <Tooltip title={`Keyboard shortcut: ${keyboardShortcut}`}>{button}</Tooltip>;
    }

    return button;
  }
);

Button.displayName = 'Button';

export default Button;
