'use client';

/**
 * OptimizedImage Component
 *
 * A wrapper around Next.js Image component with built-in optimizations:
 * - Automatic blur placeholder generation
 * - Loading state handling with skeleton
 * - Error fallback with placeholder
 * - Responsive sizing presets
 * - Lazy loading by default
 *
 * @example
 * // Basic usage
 * <OptimizedImage
 *   src="/products/ring-001.jpg"
 *   alt="Gold Ring"
 *   width={400}
 *   height={300}
 * />
 *
 * // With blur placeholder
 * <OptimizedImage
 *   src="/products/ring-001.jpg"
 *   alt="Gold Ring"
 *   width={400}
 *   height={300}
 *   blurDataURL="data:image/jpeg;base64,..."
 * />
 *
 * // Avatar preset
 * <OptimizedImage
 *   src="/avatars/user-001.jpg"
 *   alt="User Avatar"
 *   preset="avatar"
 * />
 *
 * @module components/ui/OptimizedImage
 */

import React, { useState, useCallback } from 'react';

import Image, { type ImageProps } from 'next/image';

import { Skeleton } from 'antd';

import { cn } from '@/lib/utils/cn';

/**
 * Preset configurations for common image sizes
 */
const IMAGE_PRESETS = {
  /** Small avatar (32x32) */
  'avatar-sm': { width: 32, height: 32, className: 'rounded-full' },
  /** Medium avatar (40x40) */
  avatar: { width: 40, height: 40, className: 'rounded-full' },
  /** Large avatar (64x64) */
  'avatar-lg': { width: 64, height: 64, className: 'rounded-full' },
  /** Extra large avatar (96x96) */
  'avatar-xl': { width: 96, height: 96, className: 'rounded-full' },
  /** Product thumbnail (80x80) */
  thumbnail: { width: 80, height: 80, className: 'rounded-lg' },
  /** Product card image (200x200) */
  'product-card': { width: 200, height: 200, className: 'rounded-lg' },
  /** Product detail image (400x400) */
  'product-detail': { width: 400, height: 400, className: 'rounded-lg' },
  /** Shop logo (120x120) */
  logo: { width: 120, height: 120, className: 'rounded-lg' },
  /** Hero/Banner image (full width) */
  hero: { width: 1200, height: 400, className: 'rounded-lg' },
  /** Certificate scan (600x800) */
  certificate: { width: 600, height: 800, className: 'rounded-lg' },
} as const;

type ImagePreset = keyof typeof IMAGE_PRESETS;

/**
 * Default blur placeholder - a subtle gold-tinted gradient
 */
const DEFAULT_BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZWY5YzMiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNmZGU2OGEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIvPjwvc3ZnPg==';

/**
 * Placeholder image for errors
 */
const ERROR_PLACEHOLDER_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjZjVmNWY0IiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjYThhOGE4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+SW1hZ2Ugbm90IGF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';

/**
 * OptimizedImage props
 */
export interface OptimizedImageProps extends Omit<ImageProps, 'placeholder'> {
  /** Use a preset configuration for common image sizes */
  preset?: ImagePreset;
  /** Show loading skeleton while image loads */
  showSkeleton?: boolean;
  /** Use blur placeholder effect */
  useBlurPlaceholder?: boolean;
  /** Custom blur data URL (base64 encoded) */
  blurDataURL?: string;
  /** Fallback image URL on error */
  fallbackSrc?: string;
  /** Container class name */
  containerClassName?: string;
  /** Show error state with placeholder */
  showErrorPlaceholder?: boolean;
}

/**
 * OptimizedImage Component
 *
 * Features:
 * - Automatic lazy loading (priority={false} by default)
 * - Blur placeholder for smooth loading experience
 * - Error handling with fallback image
 * - Preset configurations for common use cases
 * - Optional skeleton loading state
 * - Next.js Image optimization (WebP/AVIF, responsive sizing)
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  preset,
  showSkeleton = false,
  useBlurPlaceholder = true,
  blurDataURL,
  fallbackSrc,
  containerClassName,
  showErrorPlaceholder = true,
  className,
  onLoad,
  onError,
  priority = false,
  ...props
}: OptimizedImageProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState(src);

  // Get preset configuration if specified
  const presetConfig = preset ? IMAGE_PRESETS[preset] : null;
  const finalWidth = width ?? presetConfig?.width ?? 100;
  const finalHeight = height ?? presetConfig?.height ?? 100;
  const presetClassName = presetConfig?.className ?? '';

  // Handle image load complete
  const handleLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      setIsLoading(false);
      onLoad?.(event);
    },
    [onLoad]
  );

  // Handle image error
  const handleError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      setIsLoading(false);

      // Try fallback image first
      if (fallbackSrc && imageSrc !== fallbackSrc) {
        setImageSrc(fallbackSrc);
        setIsLoading(true);
        return;
      }

      // Use error placeholder
      if (showErrorPlaceholder && imageSrc !== ERROR_PLACEHOLDER_URL) {
        setImageSrc(ERROR_PLACEHOLDER_URL);
        setIsLoading(true);
        return;
      }

      onError?.(event);
    },
    [fallbackSrc, imageSrc, showErrorPlaceholder, onError]
  );

  // Determine placeholder mode
  const placeholderMode = useBlurPlaceholder ? 'blur' : 'empty';
  const finalBlurDataURL = blurDataURL ?? DEFAULT_BLUR_DATA_URL;

  return (
    <div
      className={cn('relative inline-block overflow-hidden', containerClassName)}
      style={{
        width: typeof finalWidth === 'number' ? finalWidth : undefined,
        height: typeof finalHeight === 'number' ? finalHeight : undefined,
      }}
    >
      {/* Loading skeleton */}
      {showSkeleton && isLoading && (
        <Skeleton.Image
          active
          className="!absolute !inset-0 !w-full !h-full"
          style={{ width: '100%', height: '100%' }}
        />
      )}

      {/* Main image */}
      <Image
        src={imageSrc}
        alt={alt}
        width={finalWidth}
        height={finalHeight}
        placeholder={placeholderMode}
        blurDataURL={placeholderMode === 'blur' ? finalBlurDataURL : undefined}
        priority={priority}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          presetClassName,
          className,
          isLoading && showSkeleton && 'opacity-0',
          'transition-opacity duration-300'
        )}
        {...props}
      />
    </div>
  );
}

OptimizedImage.displayName = 'OptimizedImage';

/**
 * Export preset names for external use
 */
export const imagePresets = Object.keys(IMAGE_PRESETS) as ImagePreset[];

/**
 * Export default blur placeholder for custom usage
 */
export { DEFAULT_BLUR_DATA_URL, ERROR_PLACEHOLDER_URL };

export default OptimizedImage;
