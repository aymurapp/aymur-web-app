import React from 'react';

import type { Metadata } from 'next';

/**
 * Auth Layout Metadata
 *
 * SEO configuration for authentication pages.
 */
export const metadata: Metadata = {
  title: {
    template: '%s | Aymur Platform',
    default: 'Authentication | Aymur Platform',
  },
  description:
    'Sign in or create an account to access the Aymur jewelry business management platform.',
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Auth Layout
 *
 * Split-screen layout for authentication pages featuring:
 * - 60/40 split on desktop (left branding panel, right form panel)
 * - Stacked layout on mobile (branding on top, form below)
 * - Gold gradient branding with luxury aesthetic
 * - Glass effect on the form card
 *
 * This is a Server Component that wraps all auth pages.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Branding (60% on desktop, top on mobile) */}
      <div
        className="
          relative
          w-full lg:w-[60%]
          min-h-[240px] lg:min-h-screen
          flex flex-col items-center justify-center
          p-8 lg:p-12
          overflow-hidden
        "
        style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
        }}
      >
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Abstract jewelry-inspired patterns */}
          <div
            className="absolute -top-20 -start-20 w-96 h-96 rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute top-1/4 end-10 w-64 h-64 rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute -bottom-32 start-1/4 w-80 h-80 rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)',
            }}
          />
          {/* Diamond pattern overlay */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23ffffff' fill-opacity='1'/%3E%3C/svg%3E")`,
              backgroundSize: '30px 30px',
            }}
          />
        </div>

        {/* Branding Content */}
        <div className="relative z-10 text-center max-w-md">
          {/* Logo */}
          <div className="mb-6 lg:mb-8">
            <div
              className="
                inline-flex items-center justify-center
                w-20 h-20 lg:w-24 lg:h-24
                rounded-2xl
                bg-white/20 backdrop-blur-sm
                shadow-lg shadow-amber-900/20
              "
            >
              {/* Diamond icon representing jewelry */}
              <svg
                className="w-10 h-10 lg:w-12 lg:h-12 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 2 9 12 22 22 9" />
                <polyline points="2 9 12 13 22 9" />
                <line x1="12" y1="2" x2="12" y2="13" />
              </svg>
            </div>
          </div>

          {/* Brand Name */}
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 lg:mb-4 tracking-tight">
            Aymur Platform
          </h1>

          {/* Tagline */}
          <p className="text-base lg:text-lg text-white/90 font-medium mb-4 lg:mb-6">
            Premium Jewelry Business Management
          </p>

          {/* Feature highlights - hidden on mobile for cleaner look */}
          <div className="hidden lg:block space-y-3 text-start">
            <FeatureItem icon="inventory" text="Complete inventory tracking" />
            <FeatureItem icon="sales" text="Point of sale & invoicing" />
            <FeatureItem icon="customers" text="Customer relationship management" />
            <FeatureItem icon="analytics" text="Real-time analytics & insights" />
          </div>
        </div>

        {/* Bottom decorative line */}
        <div
          className="
            absolute bottom-0 start-0 end-0 h-1
            bg-gradient-to-r from-transparent via-white/30 to-transparent
          "
        />
      </div>

      {/* Right Panel - Form Content (40% on desktop, bottom on mobile) */}
      <div
        className="
          w-full lg:w-[40%]
          min-h-[calc(100vh-240px)] lg:min-h-screen
          flex items-center justify-center
          p-6 sm:p-8 lg:p-12
          bg-stone-50
        "
      >
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

/**
 * Feature Item Component
 *
 * Displays a feature with an icon and text.
 */
function FeatureItem({ icon, text }: { icon: string; text: string }) {
  const getIcon = () => {
    switch (icon) {
      case 'inventory':
        return (
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'sales':
        return (
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        );
      case 'customers':
        return (
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      case 'analytics':
        return (
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-3 text-white/80">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
        {getIcon()}
      </div>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}
