'use client';

/**
 * TanStack Query Provider for Next.js App Router
 *
 * This provider wraps the application with QueryClientProvider,
 * enabling TanStack Query functionality throughout the component tree.
 *
 * Usage in layout.tsx:
 * ```tsx
 * import { QueryProvider } from '@/lib/query';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <QueryProvider>{children}</QueryProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */

import { type ReactNode } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { getQueryClient } from './client';

interface QueryProviderProps {
  children: ReactNode;
  /**
   * Show React Query Devtools in development
   * @default true in development, false in production
   */
  showDevtools?: boolean;
}

/**
 * Query Provider Component
 *
 * Provides the QueryClient context to all child components.
 * Includes React Query Devtools for development debugging.
 *
 * Note: We avoid useState when initializing the query client
 * because if there's no suspense boundary between this component
 * and code that may suspend, React will throw away the client
 * on the initial render.
 */
export function QueryProvider({ children, showDevtools }: QueryProviderProps): JSX.Element {
  // Get the appropriate query client for the environment
  // Server: new client per request
  // Browser: singleton client
  const queryClient = getQueryClient();

  // Determine if devtools should be shown
  const shouldShowDevtools = showDevtools ?? process.env.NODE_ENV === 'development';

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {shouldShowDevtools && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}

/**
 * Re-export commonly used TanStack Query utilities
 * for convenience when importing from this module
 */
export { HydrationBoundary, dehydrate, useQueryClient } from '@tanstack/react-query';
