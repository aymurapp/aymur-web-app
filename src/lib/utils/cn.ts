/**
 * Class Name Merger Utility
 * Combines clsx and tailwind-merge for optimal class name handling
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names with Tailwind CSS conflict resolution
 *
 * This utility combines clsx for conditional class handling with
 * tailwind-merge for resolving Tailwind CSS class conflicts.
 *
 * @example
 * // Basic usage
 * cn('px-2 py-1', 'px-4') // => 'py-1 px-4'
 *
 * // Conditional classes
 * cn('base-class', isActive && 'active-class', { 'error': hasError })
 *
 * // With arrays
 * cn(['flex', 'items-center'], 'justify-between')
 *
 * @param inputs - Class values to merge (strings, objects, arrays, booleans)
 * @returns Merged class string with conflicts resolved
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
