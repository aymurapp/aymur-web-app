# Aymur Platform - Tech Stack & Architecture Plan

## Project Overview

**Name:** Aymur Platform
**Type:** B2B SaaS - Multi-tenant Jewelry Business Management System
**Domains:**

- Marketing: `aymur.com`
- App: `platform.aymur.com`

**Database:** Already complete in Supabase (106 tables, 65 functions, 147 RLS policies)

---

## Requirements Summary

| Category     | Decision                                      |
| ------------ | --------------------------------------------- |
| Framework    | Next.js 14+ (App Router)                      |
| UI Library   | Ant Design                                    |
| Visual Style | Rich & luxurious, gold tones                  |
| Typography   | Modern sans-serif (Inter / Plus Jakarta Sans) |
| Languages    | EN, FR, ES, NL, AR (RTL support)              |
| Scope        | Full system (all 13 domains)                  |
| Mobile       | Desktop-first (native app planned later)      |
| Real-time    | Full real-time (Supabase Realtime)            |
| Deployment   | Vercel                                        |

---

## Tech Stack

### Core Framework

```
next: ^14.2.x          # App Router, Server Components, Middleware
react: ^18.3.x         # React 18 with concurrent features
typescript: ^5.4.x     # Strict mode enabled
```

### UI & Styling

```
antd: ^5.x                      # Ant Design components
@ant-design/nextjs-registry     # REQUIRED: Prevents FOUC in App Router
@ant-design/cssinjs             # CSS-in-JS (match antd's internal version)
@ant-design/charts              # Chart library (consistent with antd)
@ant-design/icons               # Icon set
tailwindcss: ^3.4.x             # Utility classes for custom styling
```

### State Management

```
@tanstack/react-query: ^5.x   # Server state, caching, mutations
zustand: ^4.x                 # Client/UI state (shop context, modals)
nuqs: ^1.x                    # URL state management
```

### Supabase Integration

```
@supabase/supabase-js: ^2.x   # Core client
@supabase/ssr: ^0.x           # SSR helpers for Next.js
```

### Forms & Validation

```
react-hook-form: ^7.x    # Form handling
zod: ^3.x                # Schema validation
@hookform/resolvers      # Zod resolver
```

### Internationalization

```
next-intl: ^3.x          # i18n for Next.js App Router
                         # Supports: EN, FR, ES, NL, AR (RTL)
```

**i18n Strategy:**
| Setting | Value |
|---------|-------|
| Translation Storage | Static JSON files in `/lib/i18n/messages/` |
| Languages | EN, FR, ES, NL, AR (RTL) |
| User Content | No translation (stays in original language) |
| Routing | URL-based (`/en/`, `/fr/`, `/ar/`) |
| Detection | Browser language → User preference → URL |
| Fallback | English if translation missing |
| RTL Support | Automatic for Arabic via `dir="rtl"` |

### Authentication

```
# Supabase Auth (built-in)
# JWT with shop_ids in app_metadata
# 2FA support via user_security_settings table
```

### Payments

```
@stripe/stripe-js: ^3.x      # Client-side Stripe
stripe: ^14.x                # Server-side Stripe (webhooks)
```

### Real-time

```
# Supabase Realtime (built-in)
# Channels for: inventory, sales, balances, notifications
```

### File Handling

```
# Supabase Storage (built-in)
# For: logos, certifications, documents
react-dropzone: ^14.x        # File upload UI
```

### Export & Print

```
@react-pdf/renderer: ^3.x    # PDF generation
xlsx: ^0.18.x                # Excel export
react-to-print: ^2.x         # Print functionality
```

### AI Integration

```
openai: ^4.x                 # OpenAI SDK (or Anthropic)
ai: ^3.x                     # Vercel AI SDK for streaming
```

### Testing

```
vitest: ^1.x                 # Unit testing
@testing-library/react       # Component testing
puppeteer                    # E2E testing (via MCP integration)
playwright: ^1.x             # E2E testing (optional, for CI)
msw: ^2.x                    # API mocking
```

**Note:** Primary E2E testing via Puppeteer MCP for development, Playwright for CI pipelines.

### Code Quality

```
eslint: ^8.x                 # Linting
prettier: ^3.x               # Formatting
husky: ^9.x                  # Git hooks
lint-staged                  # Pre-commit checks
commitlint                   # Commit message linting
```

### Documentation

```
@storybook/react: ^8.x       # Component documentation
chromatic                    # Visual regression testing
```

### Monitoring

```
@sentry/nextjs: ^8.x         # Error tracking & performance
```

### Utilities

```
date-fns: ^3.x               # Date manipulation
clsx + tailwind-merge        # Class name utilities
lucide-react                 # Additional icons
```

### Barcode & Scanning

```
jsbarcode: ^3.x              # Barcode generation (Code128, EAN-13, QR)
html5-qrcode: ^2.x           # Camera barcode scanning (mobile + desktop)
```

### Calendar & Tour

```
@fullcalendar/react: ^6.x    # Calendar for reminders/deadlines
react-joyride: ^2.x          # Interactive onboarding tour
```

### Drag & Drop

```
@dnd-kit/core: ^6.x          # Analytics report builder drag-drop
@dnd-kit/sortable            # Sortable lists
```

### Address & Phone

```
@react-google-maps/api       # Google Places autocomplete
# OR use-places-autocomplete  # Lightweight Places wrapper
```

**Note:** Twilio Lookup used for phone validation (same Twilio account as OTP)

---

## Supabase Setup

### Environment Variables

```bash
# .env.local (development)
# .env.production (production - set in Vercel)

# Supabase - Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase - Server-only (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or https://platform.aymur.com
NEXT_PUBLIC_MARKETING_URL=https://aymur.com
```

### File Structure

```
/lib/supabase/
├── client.ts            # Browser client (singleton)
├── server.ts            # Server client (per-request)
├── middleware.ts        # Session refresh logic
├── admin.ts             # Service role client (webhooks only)
└── realtime.ts          # Real-time channel helpers

/lib/types/
├── database.ts          # Generated from Supabase CLI
└── index.ts             # Re-exports
```

### Type Generation

**Option 1: Via Supabase MCP (Recommended)**

```
Ask Claude to generate types using the Supabase MCP tool.
Types are automatically generated and can be written to lib/types/database.ts
```

**Option 2: Via Supabase CLI**

```bash
# Install Supabase CLI (if needed)
npm install -g supabase

# Login and generate types
supabase login
supabase gen types typescript --project-id "your-project-id" > lib/types/database.ts
```

### Generated Types Usage

```typescript
// lib/types/database.ts (auto-generated)
export type Database = {
  public: {
    Tables: {
      customers: {
        Row: { id_customer: string; full_name: string /* ... */ };
        Insert: {
          /* ... */
        };
        Update: {
          /* ... */
        };
      };
      inventory_items: {
        /* ... */
      };
      // ... all 106 tables
    };
    Functions: {
      calculate_customer_balance: {
        /* ... */
      };
      // ... all 65 functions
    };
    Enums: {
      item_status: 'available' | 'sold' | 'reserved' | 'workshop';
      // ... all enums
    };
  };
};

// Type helpers for convenience
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
```

### Browser Client (Client Components)

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Server Client (Server Components, Actions, Route Handlers)

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types/database';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component - middleware handles refresh
          }
        },
      },
    }
  );
}
```

### Admin Client (Webhooks & Background Jobs)

```typescript
// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

// WARNING: Only use in server-side code (API routes, webhooks)
// This client bypasses RLS - use with caution
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

### Real-time Helpers

```typescript
// lib/supabase/realtime.ts
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from './client';

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionConfig<T> {
  channel: string;
  table: string;
  schema?: string;
  filter?: string;
  event?: RealtimeEvent;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: { old: T; new: T }) => void;
  onDelete?: (payload: T) => void;
}

export function subscribeToTable<T>({
  channel,
  table,
  schema = 'public',
  filter,
  event = '*',
  onInsert,
  onUpdate,
  onDelete,
}: SubscriptionConfig<T>): RealtimeChannel {
  const supabase = createClient();

  const channelInstance = supabase
    .channel(channel)
    .on(
      'postgres_changes',
      {
        event,
        schema,
        table,
        filter,
      },
      (payload) => {
        if (payload.eventType === 'INSERT' && onInsert) {
          onInsert(payload.new as T);
        }
        if (payload.eventType === 'UPDATE' && onUpdate) {
          onUpdate({ old: payload.old as T, new: payload.new as T });
        }
        if (payload.eventType === 'DELETE' && onDelete) {
          onDelete(payload.old as T);
        }
      }
    )
    .subscribe();

  return channelInstance;
}

// Convenience function to unsubscribe
export function unsubscribe(channel: RealtimeChannel) {
  const supabase = createClient();
  supabase.removeChannel(channel);
}
```

### Usage Patterns

```typescript
// Server Component - fetching data
import { createClient } from '@/lib/supabase/server';

export default async function InventoryPage({ params }: { params: { shopId: string } }) {
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from('inventory_items')
    .select(`
      *,
      category:product_categories(category_name),
      metal_type:metal_types(metal_name)
    `)
    .eq('id_shop', params.shopId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return <InventoryList items={items} />;
}
```

```typescript
// Client Component - mutations
'use client';

import { createClient } from '@/lib/supabase/client';

export function useCreateCustomer(shopId: string) {
  const supabase = createClient();

  const createCustomer = async (data: CustomerInput) => {
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        id_shop: shopId,
        ...data,
      })
      .select()
      .single();

    if (error) throw error;
    return customer;
  };

  return { createCustomer };
}
```

```typescript
// Server Action - with revalidation
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateInventoryItem(
  itemId: string,
  shopId: string,
  data: Partial<InventoryItem>
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('inventory_items')
    .update(data)
    .eq('id_item', itemId)
    .eq('id_shop', shopId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/[locale]/${shopId}/inventory`);
  return { success: true };
}
```

```typescript
// Webhook handler - using admin client
// app/api/webhooks/stripe/route.ts
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const supabase = createAdminClient();

  // Admin client bypasses RLS for webhook operations
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'active' })
    .eq('stripe_subscription_id', subscriptionId);

  // ...
}
```

### RLS Context

```typescript
// All queries automatically respect RLS because:
// 1. Browser client uses anon key + user's JWT from cookies
// 2. Server client uses anon key + user's JWT from cookies
// 3. RLS policies check: auth.uid() = id_user OR id_shop = ANY(auth.jwt()->app_metadata->shop_ids)

// Example RLS policy (already in database):
/*
CREATE POLICY "Users can view their shop's customers"
ON customers FOR SELECT
USING (
  id_shop = ANY(
    (SELECT shop_ids FROM auth.jwt() -> 'app_metadata' ->> 'shop_ids')::uuid[]
  )
);
*/
```

### Error Handling Pattern

```typescript
// lib/supabase/utils.ts
import { PostgrestError } from '@supabase/supabase-js';

export function handleSupabaseError(error: PostgrestError): string {
  // Map common Postgres errors to user-friendly messages
  const errorMap: Record<string, string> = {
    '23505': 'This record already exists.',
    '23503': 'Cannot delete - this record is referenced elsewhere.',
    '42501': 'You do not have permission for this action.',
    PGRST301: 'Session expired. Please log in again.',
  };

  return errorMap[error.code] || error.message || 'An unexpected error occurred.';
}

// Usage
try {
  const { error } = await supabase.from('customers').insert(data);
  if (error) throw error;
} catch (error) {
  const message = handleSupabaseError(error as PostgrestError);
  toast.error(message);
}
```

### Development Workflow

**With Supabase MCP** (simplest approach):

```bash
# 1. Just run the dev server
npm run dev

# 2. Ask Claude to:
#    - Generate types via MCP → writes to lib/types/database.ts
#    - Query/inspect tables via MCP
#    - Apply migrations via MCP
#    - Check advisors (security/performance) via MCP
```

**Supabase MCP gives you:**

- Direct database access for queries and mutations
- Type generation without CLI setup
- Table inspection and schema browsing
- Migration management
- Security/performance advisors

**Why connect to cloud directly:**

- Database is already complete (106 tables, 65 functions, 147 RLS policies)
- No local Docker/Postgres setup needed
- MCP handles all Supabase interactions

### Configuration Summary

| Setting         | Development             | Production                   |
| --------------- | ----------------------- | ---------------------------- |
| Supabase URL    | **Cloud project**       | Same cloud project           |
| Database        | **Cloud (same)**        | Cloud                        |
| Auth Redirect   | `http://localhost:3000` | `https://platform.aymur.com` |
| Service Role    | In `.env.local`         | In Vercel env vars           |
| Type Generation | `npm run db:types`      | CI/CD or manual              |
| Local Docker    | **Not needed**          | N/A                          |

---

## Project Structure

```
/app
├── (marketing)              # aymur.com - Landing pages
│   ├── page.tsx             # Home
│   ├── pricing/
│   ├── features/
│   └── layout.tsx
│
├── (auth)                   # Authentication pages
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   ├── verify-email/
│   └── layout.tsx           # Split-screen layout
│
├── (platform)               # platform.aymur.com - Main app
│   ├── [locale]             # i18n routing
│   │   ├── [shopId]         # Multi-tenant routing
│   │   │   ├── dashboard/
│   │   │   ├── inventory/
│   │   │   │   ├── items/
│   │   │   │   ├── categories/
│   │   │   │   ├── metals/
│   │   │   │   └── stones/
│   │   │   ├── sales/
│   │   │   │   ├── transactions/
│   │   │   │   ├── customers/
│   │   │   │   └── payments/
│   │   │   ├── purchases/
│   │   │   │   ├── orders/
│   │   │   │   ├── suppliers/
│   │   │   │   └── payments/
│   │   │   ├── workshops/
│   │   │   ├── deliveries/
│   │   │   ├── expenses/
│   │   │   │   ├── records/
│   │   │   │   ├── budgets/
│   │   │   │   └── approvals/
│   │   │   ├── payroll/
│   │   │   │   ├── periods/
│   │   │   │   ├── records/
│   │   │   │   └── advances/
│   │   │   ├── analytics/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── reports/
│   │   │   │   └── insights/
│   │   │   ├── ai/
│   │   │   │   └── assistant/
│   │   │   ├── settings/
│   │   │   │   ├── shop/
│   │   │   │   ├── staff/
│   │   │   │   ├── roles/
│   │   │   │   └── integrations/
│   │   │   └── layout.tsx   # Sidebar + Header layout
│   │   │
│   │   ├── shops/           # Shop management (multi-shop)
│   │   ├── subscription/    # Billing & plans
│   │   └── profile/         # User settings
│   │
│   └── layout.tsx           # Platform root layout
│
├── api/                     # API routes
│   ├── webhooks/
│   │   ├── stripe/
│   │   └── supabase/
│   ├── ai/
│   │   └── chat/
│   └── export/
│       ├── pdf/
│       └── excel/
│
└── layout.tsx               # Root layout

/components
├── ui/                          # Ant Design wrappers (8 components)
│   ├── Button.tsx               # Permission-aware, loading states
│   ├── Table.tsx                # Server pagination, column config
│   ├── Modal.tsx                # Consistent footer, form integration
│   ├── Form.tsx                 # Zod integration, error handling
│   ├── Select.tsx               # Async search, infinite scroll
│   ├── DatePicker.tsx           # Locale, presets
│   ├── Upload.tsx               # Supabase integration
│   └── Card.tsx                 # Hover effects, skeleton
│
├── common/                      # Shared components (~20)
│   ├── data/                    # Data display
│   │   ├── DataTable.tsx        # Server-side paginated table
│   │   ├── StatCard.tsx         # Dashboard metric card
│   │   ├── EmptyState.tsx       # Empty state with illustration
│   │   ├── LoadingSkeleton.tsx  # Shimmer placeholders
│   │   ├── Badge.tsx            # Status badges
│   │   ├── Avatar.tsx           # User/shop avatar
│   │   ├── PriceDisplay.tsx     # Currency formatted price
│   │   └── WeightDisplay.tsx    # Weight with unit
│   ├── forms/                   # Reusable form inputs
│   │   ├── FormModal.tsx        # Modal with form wrapper
│   │   ├── AddressInput.tsx     # Google Places autocomplete
│   │   ├── PhoneInput.tsx       # Country code + Twilio validation
│   │   ├── CurrencyInput.tsx    # Amount with currency
│   │   ├── WeightInput.tsx      # Weight with unit selector
│   │   ├── ImageUpload.tsx      # Multi-image upload (max 3)
│   │   ├── FileUpload.tsx       # Document upload
│   │   └── SearchSelect.tsx     # Async searchable select
│   └── feedback/                # Feedback components
│       ├── ConfirmModal.tsx     # Delete/action confirmation
│       └── ErrorBoundary.tsx    # Error fallback UI
│
├── layout/                      # App shell (5 components)
│   ├── Sidebar.tsx              # Collapsible nav + shop switcher
│   ├── Header.tsx               # Search, notifications, user menu
│   ├── PageHeader.tsx           # Title, breadcrumbs, actions
│   ├── FAB.tsx                  # Floating action button
│   └── LockedFeature.tsx        # Permission-aware wrapper
│
├── domain/                      # Domain-specific (~50 components)
│   ├── inventory/               # ItemCard, ItemForm, BarcodeScanner...
│   ├── sales/                   # POSLayout, CartItem, PaymentForm...
│   ├── customers/               # ContactCard, TransactionHistory...
│   ├── suppliers/               # Same pattern as customers
│   ├── workshops/               # KanbanBoard, OrderCard, TimelineView...
│   ├── expenses/                # ExpenseForm, BudgetProgressBar...
│   ├── payroll/                 # StaffSalaryCard, SalaryCalculator...
│   ├── deliveries/              # DeliveryCard, TrackingTimeline...
│   ├── analytics/               # ReportBuilder, ChartWidget...
│   ├── ai/                      # ChatBubble, ChatPanel, SparkleButton...
│   └── settings/                # ShopForm, RolePermissions...
│
└── charts/                      # Chart components
    ├── LineChart.tsx
    ├── BarChart.tsx
    ├── PieChart.tsx
    └── AreaChart.tsx

/lib
├── supabase/
│   ├── client.ts            # Browser client
│   ├── server.ts            # Server client
│   ├── middleware.ts        # Auth middleware
│   └── realtime.ts          # Realtime subscriptions
├── stripe/
│   ├── client.ts
│   └── webhooks.ts
├── ai/
│   ├── client.ts
│   └── prompts.ts
├── i18n/
│   ├── routing.ts           # Locale configuration
│   ├── navigation.ts        # Typed navigation helpers
│   ├── request.ts           # Server-side locale loading
│   └── messages/
│       ├── en.json
│       ├── fr.json
│       ├── es.json
│       ├── nl.json
│       └── ar.json
├── hooks/                       # Custom hooks (~25)
│   ├── auth/
│   │   ├── useUser.ts           # Current user data
│   │   ├── useSession.ts        # Session management
│   │   └── useAuth.ts           # Login/logout/register
│   ├── shop/
│   │   ├── useShop.ts           # Current shop context
│   │   ├── useShops.ts          # All accessible shops
│   │   └── useShopAccess.ts     # Role & permissions in shop
│   ├── permissions/
│   │   ├── usePermissions.ts    # Permission checks (can/cannot)
│   │   └── useRole.ts           # User role in current shop
│   ├── data/
│   │   ├── useSupabaseQuery.ts  # TanStack Query + Supabase
│   │   ├── useSupabaseMutation.ts
│   │   └── useRealtime.ts       # Real-time subscriptions
│   ├── ui/
│   │   ├── useTheme.ts          # Dark/light mode
│   │   ├── useLocale.ts         # Language & direction
│   │   ├── useSidebar.ts        # Sidebar collapsed state
│   │   └── useModal.ts          # Modal state management
│   └── utils/
│       ├── useDebounce.ts
│       ├── useMediaQuery.ts
│       └── useCopyToClipboard.ts
├── utils/
│   ├── format.ts                # formatCurrency, formatWeight, formatDate, formatPhone
│   ├── cn.ts                    # clsx + tailwind-merge
│   ├── generate.ts              # generateSKU, generateBarcode
│   ├── calculate.ts             # calculateBalance, calculateTotals
│   ├── validation.ts            # Common Zod schemas
│   ├── export.ts                # PDF/Excel generation
│   └── print.ts
├── constants/
│   ├── permissions.ts           # Permission keys
│   ├── status.ts                # Status enums
│   └── config.ts                # App configuration
└── types/
    └── database.ts              # Generated Supabase types

/stores
├── shopStore.ts             # Current shop context
├── uiStore.ts               # UI state (sidebar, modals)
├── notificationStore.ts     # Notification center
└── aiStore.ts               # AI conversation state

/styles
├── globals.css              # Global styles + Tailwind
├── antd-theme.ts            # Ant Design theme config
└── rtl.css                  # RTL overrides for Arabic

/tests
├── unit/
├── integration/
└── e2e/

/stories                     # Storybook stories

/public
├── locales/
├── fonts/
└── images/
```

---

## Design System

### Color Palette (Gold Tones)

```css
:root {
  /* Primary - Gold */
  --primary-50: #fffbeb;
  --primary-100: #fef3c7;
  --primary-200: #fde68a;
  --primary-300: #fcd34d;
  --primary-400: #fbbf24;
  --primary-500: #f59e0b; /* Main gold */
  --primary-600: #d97706;
  --primary-700: #b45309;
  --primary-800: #92400e;
  --primary-900: #78350f;

  /* Neutral - Warm grays */
  --neutral-50: #fafaf9;
  --neutral-900: #1c1917;

  /* Accent - Deep burgundy/wine */
  --accent-500: #881337;

  /* Success, Warning, Error */
  --success: #059669;
  --warning: #d97706;
  --error: #dc2626;
}
```

### Typography

```css
/* Headings & Body: Inter or Plus Jakarta Sans */
--font-sans: 'Inter', 'Plus Jakarta Sans', system-ui, sans-serif;

/* Sizes */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
--text-4xl: 2.25rem;
```

### Component Theme (Ant Design)

```typescript
// antd-theme.ts
export const theme = {
  token: {
    colorPrimary: '#f59e0b',
    colorSuccess: '#059669',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    colorInfo: '#0ea5e9',
    borderRadius: 8,
    fontFamily: 'Inter, Plus Jakarta Sans, system-ui, sans-serif',
  },
  components: {
    Button: {
      primaryShadow: '0 2px 8px rgba(245, 158, 11, 0.35)',
    },
    Card: {
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
  },
};
```

### Dark Mode

| Setting    | Value                                             |
| ---------- | ------------------------------------------------- |
| Default    | Follows system preference                         |
| Override   | User can override in settings                     |
| Toggle     | Sun/moon icon in header (always visible)          |
| Storage    | User preference stored in localStorage + database |
| Transition | Smooth 200ms color transition                     |

---

## UI/UX Architecture

### UI Component Decisions Summary

| Category            | Decision                                            |
| ------------------- | --------------------------------------------------- |
| **UI Library**      | Ant Design 5                                        |
| **Visual Style**    | Rich & luxurious, gold tones                        |
| **Forms**           | Ant Design Form + Zod validation                    |
| **Data Tables**     | Ant Design Table with infinite scroll               |
| **Table Actions**   | Dropdown menu (three-dot)                           |
| **Table Selection** | Click row to select                                 |
| **Icons**           | @ant-design/icons only                              |
| **Charts**          | @ant-design/charts                                  |
| **Modals/Drawers**  | Drawers for forms/details, Modals for confirmations |
| **Loading**         | Skeletons for pages, Spinners for actions           |
| **Empty States**    | Custom illustrations with CTA                       |
| **Notifications**   | Message for forms, Toast for async                  |
| **Sidebar**         | Collapsible to icons                                |
| **Shop Switcher**   | Modal with search                                   |
| **Filters**         | Collapsible panel above tables                      |
| **FAB**             | Bottom-right floating button                        |
| **AI Bubble**       | Stacked above FAB                                   |
| **Inventory Grid**  | Uniform card grid                                   |
| **Kanban**          | @dnd-kit                                            |
| **Command Palette** | Phase 4 (later)                                     |

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Global Search | Notifications (badge) | User Menu  │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                   │
│  Sidebar │              Main Content Area                   │
│  (icons  │                                                   │
│   when   │  ┌─────────────────────────────────────────────┐ │
│ collapsed│  │  Page Header + Breadcrumbs + Actions        │ │
│   )      │  ├─────────────────────────────────────────────┤ │
│          │  │                                             │ │
│  Shop    │  │              Page Content                   │ │
│ Switcher │  │                                             │ │
│  (top)   │  │                                             │ │
│          │  └─────────────────────────────────────────────┘ │
│          │                                                   │
│          │  ┌─────┐  FAB Button (Quick Actions)             │
│          │  │ ＋ │                                           │
│          │  └─────┘                                          │
└──────────┴──────────────────────────────────────────────────┘
```

### Page-by-Page UI Specifications

#### Dashboard

- **Layout**: Activity feed focus
- **Views**: Per-shop (default) + Combined multi-shop view (toggle)
- **Components**:
  - Recent activity feed (sales, purchases, alerts)
  - Quick action buttons
  - Real-time metal prices widget (API placeholder)
  - Key notifications/alerts
  - Mini stats cards (today's sales, pending orders)
- **Multi-shop users**: Can toggle between single shop and combined view

#### Inventory

- **View**: Uniform card grid (equal-sized cards in rows)
- **Features**:
  - Grid of product cards with images
  - Hover shows quick details (price, weight, status)
  - Filters: collapsible panel (category, metal type, purity, status, price range)
  - Sort: date added, price, name
  - Click opens drawer for full details/edit
  - Infinite scroll pagination

#### Sales (POS)

- **Layout**: POS-style quick checkout
- **Access**: Dedicated page (/sales/pos) + FAB quick modal
- **Components**:
  - Left: Product search/grid (quick add)
  - Right: Cart/invoice builder
  - Customer selector (create new inline)
  - Payment section (follow database payment methods)
  - Quick total + checkout button
  - Print receipt (configurable auto-print in settings)

#### Barcode Scanner

- **Methods**: Hardware scanner (keyboard input) + Camera scan
- **Workflow**:
  1. Scan barcode → Show item dialog with details
  2. Multiple scans → Build list of items
  3. List shows items with remove option
  4. "Proceed to POS" button → Opens POS with items

#### New User Onboarding

- **Type**: Optional setup wizard (can skip)
- **Steps**: Welcome → Categories → Metals → First Item → Tour
- **Language**: User selects during registration

#### Customers/Suppliers

- **View**: Contact cards (no photo - only ID card images)
- **Card shows**: Name, phone, balance, status badge
- **Click**: Modal with full details, transaction history, ID card images
- **Filters**: Balance status, activity, date range

#### Workshop Orders

- **Views** (togglable):
  - Kanban board (drag between status columns)
  - Table view (detailed, sortable)
  - Timeline view (by due date)
- **Status columns**: Pending → Accepted → In Progress → Completed → Delivered

#### Expenses & Budgets

- **Follow database structure**
- **Features**:
  - Category breakdown visual
  - Budget vs actual comparison charts
  - Approval workflow (pending approvals at top)
  - Quick expense entry

#### Payroll

- **Layout**: Staff list view
- **Features**:
  - Staff cards with salary info
  - Support for staff not invited to app (database aligned)
  - Click for salary history
  - Period-based pay runs
  - Advance requests management

#### Analytics

- **Type**: Custom report builder
- **Features**:
  - Drag-drop report builder
  - Pre-built report templates
  - Date range picker
  - Export to PDF/Excel
  - Save custom reports

#### AI Assistant

- **Appearance**: Floating chat bubble (bottom-right) + dedicated `/ai` page
- **Trigger**: ✨ Sparkle icon buttons on pages (on-demand to save tokens)
- **Context**: Opt-in "Share with AI" button to provide page context
- **Memory**: Persistent conversation history (ai_conversations table)

**AI Features by Page:**

| Page          | AI Features                                                  | Trigger          |
| ------------- | ------------------------------------------------------------ | ---------------- |
| **Dashboard** | Daily summary, alert explanations, action suggestions        | ✨ button click  |
| **Inventory** | Similar items, stock alerts/reorder suggestions              | ✨ button click  |
| **Sales/POS** | None (keep simple, no distractions)                          | -                |
| **Analytics** | Natural language queries, insight generation, report builder | ✨ button click  |
| **Chat**      | Full conversation, complex queries, multi-step tasks         | Always available |

**AI Action Execution:**

| Action Type      | Behavior             | Examples                        |
| ---------------- | -------------------- | ------------------------------- |
| **Read-only**    | Auto-execute         | Queries, reports, searches      |
| **Safe creates** | Auto with undo toast | Create customer, add note       |
| **Writes**       | Preview + approval   | Create sale, update price       |
| **Sensitive**    | Double confirmation  | Delete, void, financial changes |

**Chat Interface:**

- Floating bubble → Opens side panel (quick questions)
- Dedicated `/ai` page → Full-screen for complex tasks
- Conversation list → Browse/search past conversations

### Navigation & Settings

#### Sidebar

- **Behavior**: Collapsible to icons
- **Shop Switcher**: Click opens modal with search (for multi-shop users)
- **Menu Structure**:
  ```
  [Shop Selector ▼]
  ─────────────────
  📊 Dashboard
  📦 Inventory
  💰 Sales
  🛒 Purchases
  🔧 Workshops
  🚚 Deliveries
  💳 Expenses
  👥 Payroll
  📈 Analytics
  🤖 AI Assistant
  ─────────────────
  ⚙️ Shop Settings
  ```

#### Header Layout

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo]  [Global Search............]  🔔  ☀️/🌙  [User Menu ▼] │
└──────────────────────────────────────────────────────────────┘
```

- **🔔**: Notification bell with badge
- **☀️/🌙**: Theme toggle (sun/moon icon)
- **User Menu**: Dropdown with profile options

#### User Menu (Top Right Dropdown)

```
┌─────────────────────┐
│ 👤 User Name        │
│    user@email.com   │
├─────────────────────┤
│ 👤 Profile          │
│ ⚙️ Settings         │
│ 💳 Billing*         │
├─────────────────────┤
│ 🚪 Log Out          │
└─────────────────────┘
* Staff see "Managed by shop owner"
```

### Search & Filters

- **Global**: Header search bar (searches everything)
- **Local Filters**: Collapsible panel above tables (expand/collapse)
- **Cmd+K**: Command palette (Phase 4 - later implementation)

### Quick Actions (FAB) & AI Bubble

- **FAB Position**: Bottom-right floating button
- **AI Bubble Position**: Bottom-right, stacked above FAB
- **FAB Expands to**:
  - ➕ New Sale
  - ➕ New Item
  - ➕ New Customer
  - ➕ Quick Expense
  - (Context-aware options)

### Modals & Forms

- **Create/Edit forms**: Drawer panels (slide from right)
- **Detail views**: Drawer for simple, Modal for complex content
- **Confirmations**: Context-dependent
  - Destructive: Modal confirm
  - Reversible: Inline confirm or undo toast
  - Critical: Double confirmation

### States

#### Empty States

- Custom illustrations with helpful text
- Clear CTA button
- Contextual tips

#### Loading

- **Pages/Lists**: Skeleton screens (gray placeholders mimicking content)
- **Buttons/Actions**: Spinner indicators
- **Infinite scroll**: Loading spinner at bottom

#### Errors

- **Form validation**: Inline messages below fields
- **API errors**: Ant Design message (top-center)
- **Background errors**: Toast notifications (top-right)
- **Critical errors**: Modal alerts

### Data Tables

- **Library**: Ant Design Table
- **Pagination**: Infinite scroll (auto-load on scroll)
- **Row Selection**: Click row to select (highlight + toolbar actions)
- **Row Actions**: Dropdown menu (three-dot icon in last column)
- **Sorting**: Click column header to sort
- **Filters**: Collapsible panel above table

### Print System

- **Method**: Browser print dialog (standard)
- **Formats**:
  - Thermal receipt (80mm)
  - A4 invoice (standard)
  - Barcode labels (10x30mm jewelry tags)
- **Templates**: System templates (not customizable)
- **Barcode support**: Item labels, receipts

### Reminders & Calendar

- **Calendar view**: Full calendar showing payment due dates, deliveries, workshop deadlines
- **Dashboard widget**: Upcoming reminders on dashboard
- **Data source**: Follow database (payment_reminders, customer_payment_reminders)
- **Notifications**: Linked to notification system

### Keyboard Shortcuts

- **Optional/configurable** by user
- **Defaults**:
  - `Cmd/Ctrl + K`: Command palette
  - `Esc`: Close modal/panel
  - `N`: New (in context)
  - Configurable in settings

### Mobile Web

- **Strategy**: Redirect to native app
- **Show**: "Download our app" prompt
- **Basic view**: Allow viewing data if needed
- **Native app**: Planned for full mobile experience

### Notifications

- **New**: Toast notification
- **History**: Bell icon dropdown with badge count
- **Badge**: Shows unread count
- **Click**: Opens notification panel

### Additional Page Specifications

#### Purchases

- **Organization**: Per supplier with invoices
- **View**: Supplier list → click for their purchases/invoices
- **Features**: Invoice tracking, payment status, balance per supplier

#### Recycled Items (Buy Old Gold)

- **Location**: Dedicated page `/purchases/recycled`
- **Workflow**: Follow database `recycled_items` table structure
- **Source**: Customer sells old jewelry OR supplier recycled goods
- **After purchase options**:
  - Direct to inventory (as-is with `source_type: 'recycled'`)
  - Melt down (follow database structure for weight recording)
  - Send to workshop (for processing/refurbishment)
- **Payment**: Records payment to customer/supplier
- **Linked**: Creates `inventory_items` with `id_recycled_item` reference
- **Melt Process**: Follow database fields in `recycled_items` table

#### Deliveries

- **View**: Delivery list with status filters
- **Features**: Tracking numbers, status updates, courier management
- **Follow database structure**

#### Shop Transfers

- **Features**:
  - Transfer list between shops
  - Financial settlements view
  - Linked shops management (neighbor_shops)
- **Follow database structure**

#### Taxes

- **Structure**: Follow database (tax_types, tax_periods, tax_records)
- **Configuration**: User sets tax rates/types in shop settings
- **Calculation**: Follow database logic
- **Reporting**: Basic tax records tracking per database
- **UI**: Settings page for tax configuration + records view

#### User Profile

- **Sections**:
  - Basic info (name, email, phone, password)
  - Security settings (2FA, sessions, login history)
  - Activity log (recent actions across shops)

#### Subscription/Billing

- **Shows**:
  - Current plan and status
  - Usage metrics (storage, staff count, AI credits)
  - Invoice history and payments
  - Upgrade/downgrade options
- **For Staff**: "Billing managed by shop owner" message

#### Staff Invitations

- **Options**:
  - Email invitation (enter email, send link)
  - Generate invitation code (staff enters manually)
- Staff can choose either method

---

## Onboarding & Authentication Flow

### Auth Pages Layout

- **Style**: Split screen (left: branding/image, right: form)
- **Left side**: Aymur logo, tagline, subtle jewelry imagery
- **Right side**: Clean form with gold accent colors

### Registration Flow

```
┌─────────────────┐
│  Landing Page   │
│  (aymur.com)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Sign Up        │  ← Split screen layout
│  - Email/Pass   │
│  - Google OAuth │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Email Verify   │
│  (Supabase)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Profile Wizard │  ← Multi-step wizard
│  Step 1: Name   │
│  Step 2: Phone  │
│  Step 3: OTP    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Choose Role    │  ← Card selection (auto-detect if has invite code)
│  "Shop Owner"   │
│  "Join a Team"  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌────────────┐
│ Owner  │  │ Staff/Other│
└───┬────┘  └─────┬──────┘
    │             │
    ▼             ▼
┌────────┐  ┌────────────┐
│ Select │  │ Enter Code │  ← Auto-detect skips role selection
│ Plan   │  │ or Check   │
│        │  │ Email      │
└───┬────┘  └─────┬──────┘
    │             │
    ▼             │
┌────────┐        │
│ Stripe │        │
│Checkout│        │
└───┬────┘        │
    │             │
    ▼             │
┌────────┐        │
│Success │        │
│ Page   │        │
└───┬────┘        │
    │             │
    ▼             │
┌────────┐        │
│ Create │        │
│ Shop   │        │
└───┬────┘        │
    │             │
    └──────┬──────┘
           │
           ▼
    ┌────────────┐
    │ Interactive│
    │ Tour       │
    └─────┬──────┘
          │
          ▼
    ┌────────────┐
    │ Dashboard  │
    └────────────┘
```

### Plan Selection Page

- **Layout**: Comparison table with monthly/annual toggle
- **Badge**: "Most Popular" on Business plan
- **Features**: Full feature comparison between Professional/Business
- **CTA**: Clear "Get Started" buttons per plan

### Post-Checkout Success Page

```
┌─────────────────────────────────────────────┐
│              🎉 [Confetti Animation]        │
│                                             │
│   "We're honored you trust us with your     │
│    business. We're here to help you         │
│    succeed."                                │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │ Your plan includes:                 │   │
│   │ ✓ 2 shops                          │   │
│   │ ✓ 4 staff members                  │   │
│   │ ✓ 70 GB storage                    │   │
│   │ ✓ 7,000 AI credits/month           │   │
│   └─────────────────────────────────────┘   │
│                                             │
│   Next: Create your first shop in 2 mins    │
│                                             │
│          [ Continue → ]                     │
└─────────────────────────────────────────────┘
```

### Shop Creation Form

**Fields (all on one page):**

- Shop name (required)
- Business type dropdown (jewelry store, workshop, wholesaler)
- Currency (required, cannot change later)
- Timezone (required)
- Language preference
- Country, City, Address (Google Places autocomplete)
- Phone number (Twilio validation)
- Logo upload (optional, can add later)

### Staff Invitation Flow

```
Owner/Manager creates invitation:
├── Option A: Email invite → Staff receives link
└── Option B: Generate code → Staff enters code

Staff receives invitation:
├── Has account → Link/code joins them to shop
└── New user → Register → Link/code joins them to shop
```

### Interactive Tour

- Highlights key features on first login
- Points out: Sidebar navigation, search, FAB, key actions
- Skippable but encouraged
- Can replay from settings

---

## Animation & Motion Design

### Principles

- **Style**: Subtle & smooth
- **Duration**: 200-300ms for most transitions
- **Easing**: `ease-out` for enters, `ease-in` for exits

### Page Transitions

- **Type**: Skeleton loading
- **Behavior**: Instant navigation, skeleton placeholders while loading
- **No page-level transitions** (instant URL change)

### Component Animations

#### Modals

```css
/* Enter */
opacity: 0 → 1
transform: scale(0.95) → scale(1)
duration: 200ms

/* Exit */
opacity: 1 → 0
transform: scale(1) → scale(0.95)
duration: 150ms
```

#### Sidebar Collapse

```css
width: 240px → 64px
duration: 200ms
ease: ease-out
```

#### Dropdowns/Menus

```css
opacity: 0 → 1
transform: translateY(-8px) → translateY(0)
duration: 150ms
```

#### FAB Expansion

```css
/* Menu items stagger in */
stagger: 50ms per item
opacity: 0 → 1
transform: scale(0.8) → scale(1)
```

#### Toast Notifications

```css
/* Enter from top-right */
transform: translateX(100%) → translateX(0)
duration: 300ms

/* Exit */
opacity: 1 → 0
duration: 200ms
```

#### Skeleton Loading

```css
/* Shimmer effect */
background: linear-gradient(90deg, #f0f0f0, #e0e0e0, #f0f0f0)
animation: shimmer 1.5s infinite
```

### Micro-interactions

- Button hover: subtle scale (1.02) + shadow
- Card hover: lift effect (shadow increase)
- Form focus: border color transition
- Status badges: subtle pulse for alerts
- Loading spinners: smooth rotation

### Disabled Animations

- Respect `prefers-reduced-motion`
- Option in user settings to disable

---

## Ant Design Setup (Next.js App Router)

### Critical Requirements

| Requirement    | Solution                                                     |
| -------------- | ------------------------------------------------------------ |
| Prevent FOUC   | Use `@ant-design/nextjs-registry` wrapper                    |
| Sub-components | Create client wrappers (can't use `Select.Option` in server) |
| Dark Mode      | Use `algorithm: theme.darkAlgorithm`                         |
| RTL (Arabic)   | Use `direction="rtl"` in ConfigProvider                      |
| CSS Variables  | Enable with `cssVar: true` for dynamic theming               |

### Root Layout Setup

```tsx
// app/layout.tsx
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, App } from 'antd';
import { theme } from '@/styles/antd-theme';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <ConfigProvider theme={theme}>
            <App>{children}</App>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
```

### Theme Configuration

```typescript
// styles/antd-theme.ts
import type { ThemeConfig } from 'antd';
import { theme as antdTheme } from 'antd';

export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: '#f59e0b', // Gold
    colorSuccess: '#059669',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    colorInfo: '#0ea5e9',
    borderRadius: 8,
    fontFamily: 'Inter, Plus Jakarta Sans, system-ui, sans-serif',
  },
  cssVar: true, // Enable CSS variables
  components: {
    Button: {
      primaryShadow: '0 2px 8px rgba(245, 158, 11, 0.35)',
    },
  },
};

export const darkTheme: ThemeConfig = {
  ...lightTheme,
  algorithm: antdTheme.darkAlgorithm,
};

// RTL theme for Arabic
export const rtlTheme: ThemeConfig = {
  ...lightTheme,
  direction: 'rtl',
};
```

### Sub-component Wrappers (Required for App Router)

```tsx
// components/ui/Typography.tsx
'use client';

import { Typography as AntTypography } from 'antd';

// Re-export sub-components for use in server components
export const Title = AntTypography.Title;
export const Text = AntTypography.Text;
export const Paragraph = AntTypography.Paragraph;
export const Link = AntTypography.Link;
```

### Static Methods (message, notification, Modal)

```tsx
// Use hooks instead of static methods for ConfigProvider support
import { App } from 'antd';

function MyComponent() {
  const { message, notification, modal } = App.useApp();

  const showMessage = () => {
    message.success('Success!'); // Inherits theme from ConfigProvider
  };
}
```

---

## Component Architecture

### Component Summary

| Category  | Count | Purpose                                  |
| --------- | ----- | ---------------------------------------- |
| ui/       | 8     | Ant Design wrappers with custom behavior |
| common/   | 20    | Shared across all domains                |
| layout/   | 5     | App shell components                     |
| domain/   | ~50   | Domain-specific components               |
| charts/   | 4     | Analytics visualizations                 |
| **Total** | ~85   | Full component library                   |

### Ant Design Wrapper Strategy

Only wrap components when adding:

- Custom behavior (loading states, permissions)
- Consistent styling patterns
- Domain-specific logic

| Wrapper    | Why Needed                                    |
| ---------- | --------------------------------------------- |
| Button     | Permission-aware disabled, loading states     |
| Table      | Server pagination, column persistence, export |
| Modal      | Consistent footer, form integration           |
| Form       | Zod resolver, error handling patterns         |
| Select     | Async search, infinite scroll for large lists |
| DatePicker | Locale support, common presets                |
| Upload     | Supabase Storage integration, image preview   |
| Card       | Hover effects, loading skeleton               |

**Use Ant Design directly (no wrapper):**
Input, InputNumber, Checkbox, Radio, Switch, Typography, Layout (Row/Col/Space), Alert, message, notification, Menu, Dropdown, Breadcrumb

### Domain Components by Module

| Domain     | Key Components                                                                          |
| ---------- | --------------------------------------------------------------------------------------- |
| inventory  | ItemCard, ItemForm, BarcodeScanner, BarcodeGenerator, CategorySelect, MetalPuritySelect |
| sales      | POSLayout, CartItem, CartSummary, CustomerSelect, PaymentForm, ReceiptPreview           |
| customers  | ContactCard, ContactDetailModal, TransactionHistory, BalanceIndicator                   |
| workshops  | KanbanBoard, OrderCard, TimelineView, WorkshopOrderForm                                 |
| expenses   | ExpenseForm, BudgetProgressBar, ApprovalActions, CategoryBreakdown                      |
| payroll    | StaffSalaryCard, SalaryCalculator, AdvanceRequestForm                                   |
| deliveries | DeliveryCard, CourierSelect, TrackingTimeline                                           |
| analytics  | ReportBuilder, ChartWidget, DateRangePicker, MetricComparison                           |
| ai         | ChatBubble, ChatPanel, ChatMessage, AIActionPreview, SparkleButton                      |
| settings   | ShopForm, RolePermissions, IntegrationCard                                              |

---

## Hooks Architecture

### Hook Categories

| Category     | Hooks                                              | Purpose                        |
| ------------ | -------------------------------------------------- | ------------------------------ |
| auth/        | useUser, useSession, useAuth                       | Authentication state & actions |
| shop/        | useShop, useShops, useShopAccess                   | Multi-tenancy context          |
| permissions/ | usePermissions, useRole                            | RBAC checks                    |
| data/        | useSupabaseQuery, useSupabaseMutation, useRealtime | Data fetching                  |
| ui/          | useTheme, useLocale, useSidebar, useModal          | UI state                       |
| utils/       | useDebounce, useMediaQuery, useCopyToClipboard     | Common utilities               |

### Key Hook Patterns

```typescript
// useShop - Multi-tenancy context (from URL param)
const { shop, shopId, isLoading } = useShop();

// usePermissions - RBAC permission checks
const { can, cannot, role } = usePermissions();
if (can('sales.create')) {
  /* render button */
}
if (cannot('expenses.approve')) {
  /* show locked */
}

// useSupabaseQuery - TanStack Query wrapper with shop isolation
const { data, isLoading, error } = useSupabaseQuery(['customers', shopId, filters], (supabase) =>
  supabase
    .from('customers')
    .select('*')
    .eq('id_shop', shopId)
    .order('created_at', { ascending: false })
);

// useSupabaseMutation - Mutations with optimistic updates
const { mutate, isPending } = useSupabaseMutation(
  (supabase, data) => supabase.from('customers').insert(data),
  { invalidateKeys: ['customers'] }
);

// useRealtime - Real-time subscriptions
useRealtime({
  channel: `inventory:${shopId}`,
  event: '*',
  table: 'inventory_items',
  filter: `id_shop=eq.${shopId}`,
  onPayload: (payload) => {
    queryClient.invalidateQueries(['inventory', shopId]);
  },
});

// useTheme - Dark/light mode with system detection
const { theme, setTheme, isDark, isSystem } = useTheme();

// useLocale - Language and RTL direction
const { locale, setLocale, dir, isRTL } = useLocale();
```

### Utility Functions

| Function                           | Purpose                         |
| ---------------------------------- | ------------------------------- |
| `formatCurrency(amount, currency)` | Currency formatting with locale |
| `formatWeight(grams, unit)`        | Weight with unit conversion     |
| `formatDate(date, locale, format)` | Date formatting with i18n       |
| `formatPhone(phone)`               | International phone format      |
| `cn(...classes)`                   | Class merger (clsx + tw-merge)  |
| `generateSKU(prefix)`              | Unique SKU generation           |
| `calculateBalance(transactions)`   | Running balance calculation     |

---

## State Management Architecture

### Overview

| Layer            | Library        | Purpose                                                 |
| ---------------- | -------------- | ------------------------------------------------------- |
| **Server State** | TanStack Query | All Supabase data (fetching, caching, mutations)        |
| **Client State** | Zustand        | UI state (shop context, modals, sidebar, notifications) |
| **URL State**    | nuqs           | Filters, pagination, search params                      |

### Zustand Stores

#### Shop Store (Multi-tenancy Context)

```typescript
// stores/shopStore.ts
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

interface ShopState {
  currentShopId: string | null;
  shops: Shop[]; // Loaded from JWT app_metadata
  isLoading: boolean;
}

interface ShopActions {
  setCurrentShop: (shopId: string) => void;
  setShops: (shops: Shop[]) => void;
}

export const useShopStore = create<ShopState & ShopActions>()(
  devtools(
    persist(
      (set) => ({
        currentShopId: null,
        shops: [],
        isLoading: true,

        setCurrentShop: (shopId) => set({ currentShopId: shopId }),
        setShops: (shops) => set({ shops, isLoading: false }),
      }),
      {
        name: 'aymur-shop',
        partialize: (state) => ({ currentShopId: state.currentShopId }),
      }
    ),
    { name: 'ShopStore' }
  )
);
```

#### UI Store

```typescript
// stores/uiStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  activeModal: string | null;
  modalData: Record<string, unknown> | null;
}

interface UIActions {
  toggleSidebar: () => void;
  setTheme: (theme: UIState['theme']) => void;
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'system',
      activeModal: null,
      modalData: null,

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setTheme: (theme) => set({ theme }),
      openModal: (modalId, data) => set({ activeModal: modalId, modalData: data ?? null }),
      closeModal: () => set({ activeModal: null, modalData: null }),
    }),
    {
      name: 'aymur-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);
```

#### Notification Store

```typescript
// stores/notificationStore.ts
import { create } from 'zustand';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  read: boolean;
  createdAt: Date;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

interface NotificationActions {
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  setNotifications: (notifications: Notification[]) => void;
}

export const useNotificationStore = create<NotificationState & NotificationActions>()((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) =>
    set((state) => {
      const newNotification = {
        ...notification,
        id: crypto.randomUUID(),
        read: false,
        createdAt: new Date(),
      };
      return {
        notifications: [newNotification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    }),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),
}));
```

#### AI Store

```typescript
// stores/aiStore.ts
import { create } from 'zustand';

interface AIState {
  isOpen: boolean;
  activeConversationId: string | null;
  isStreaming: boolean;
  pendingOperation: AIOperation | null;
}

interface AIActions {
  openChat: () => void;
  closeChat: () => void;
  setConversation: (id: string | null) => void;
  setStreaming: (streaming: boolean) => void;
  setPendingOperation: (operation: AIOperation | null) => void;
}

export const useAIStore = create<AIState & AIActions>()((set) => ({
  isOpen: false,
  activeConversationId: null,
  isStreaming: false,
  pendingOperation: null,

  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  setConversation: (id) => set({ activeConversationId: id }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setPendingOperation: (operation) => set({ pendingOperation: operation }),
}));
```

### TanStack Query Setup

#### Query Client Configuration

```typescript
// lib/query/client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
      // Network mode for offline handling
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});
```

#### Query Key Factory

```typescript
// lib/query/keys.ts

// Type-safe query key factory
export const queryKeys = {
  // Inventory domain
  inventory: {
    all: (shopId: string) => ['inventory', shopId] as const,
    list: (shopId: string, filters?: InventoryFilters) =>
      ['inventory', shopId, 'list', filters] as const,
    detail: (shopId: string, itemId: string) => ['inventory', shopId, 'detail', itemId] as const,
    categories: (shopId: string) => ['inventory', shopId, 'categories'] as const,
  },

  // Sales domain
  sales: {
    all: (shopId: string) => ['sales', shopId] as const,
    list: (shopId: string, filters?: SalesFilters) => ['sales', shopId, 'list', filters] as const,
    detail: (shopId: string, saleId: string) => ['sales', shopId, 'detail', saleId] as const,
  },

  // Customers domain
  customers: {
    all: (shopId: string) => ['customers', shopId] as const,
    list: (shopId: string, filters?: CustomerFilters) =>
      ['customers', shopId, 'list', filters] as const,
    detail: (shopId: string, customerId: string) =>
      ['customers', shopId, 'detail', customerId] as const,
    transactions: (shopId: string, customerId: string) =>
      ['customers', shopId, customerId, 'transactions'] as const,
  },

  // Suppliers domain
  suppliers: {
    all: (shopId: string) => ['suppliers', shopId] as const,
    list: (shopId: string, filters?: SupplierFilters) =>
      ['suppliers', shopId, 'list', filters] as const,
    detail: (shopId: string, supplierId: string) =>
      ['suppliers', shopId, 'detail', supplierId] as const,
  },

  // Purchases domain
  purchases: {
    all: (shopId: string) => ['purchases', shopId] as const,
    list: (shopId: string, filters?: PurchaseFilters) =>
      ['purchases', shopId, 'list', filters] as const,
    detail: (shopId: string, purchaseId: string) =>
      ['purchases', shopId, 'detail', purchaseId] as const,
  },

  // Workshops domain
  workshops: {
    all: (shopId: string) => ['workshops', shopId] as const,
    orders: (shopId: string, filters?: WorkshopFilters) =>
      ['workshops', shopId, 'orders', filters] as const,
    order: (shopId: string, orderId: string) => ['workshops', shopId, 'order', orderId] as const,
  },

  // Expenses domain
  expenses: {
    all: (shopId: string) => ['expenses', shopId] as const,
    list: (shopId: string, filters?: ExpenseFilters) =>
      ['expenses', shopId, 'list', filters] as const,
    budgets: (shopId: string) => ['expenses', shopId, 'budgets'] as const,
  },

  // Payroll domain
  payroll: {
    all: (shopId: string) => ['payroll', shopId] as const,
    periods: (shopId: string) => ['payroll', shopId, 'periods'] as const,
    records: (shopId: string, periodId: string) =>
      ['payroll', shopId, 'records', periodId] as const,
  },

  // Analytics domain
  analytics: {
    dashboard: (shopId: string) => ['analytics', shopId, 'dashboard'] as const,
    daily: (shopId: string, date: string) => ['analytics', shopId, 'daily', date] as const,
    reports: (shopId: string, reportType: string) =>
      ['analytics', shopId, 'reports', reportType] as const,
  },

  // Reference data (global)
  metalTypes: () => ['metalTypes'] as const,
  metalPurities: (metalTypeId?: string) => ['metalPurities', metalTypeId] as const,
  stoneTypes: () => ['stoneTypes'] as const,

  // User-specific
  user: {
    profile: () => ['user', 'profile'] as const,
    notifications: () => ['user', 'notifications'] as const,
  },
} as const;
```

#### Custom Query Hook Pattern

```typescript
// lib/hooks/data/useSupabaseQuery.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';

type QueryFn<T> = (supabase: ReturnType<typeof createClient>) => Promise<T>;

export function useSupabaseQuery<T>(
  queryKey: readonly unknown[],
  queryFn: QueryFn<T>,
  options?: Omit<UseQueryOptions<T, PostgrestError>, 'queryKey' | 'queryFn'>
) {
  const supabase = createClient();

  return useQuery<T, PostgrestError>({
    queryKey,
    queryFn: () => queryFn(supabase),
    ...options,
  });
}

// Example usage:
// const { data, isLoading } = useSupabaseQuery(
//   queryKeys.customers.list(shopId, filters),
//   async (supabase) => {
//     const { data, error } = await supabase
//       .from('customers')
//       .select('*')
//       .eq('id_shop', shopId)
//       .order('created_at', { ascending: false });
//     if (error) throw error;
//     return data;
//   }
// );
```

#### Custom Mutation Hook Pattern

```typescript
// lib/hooks/data/useSupabaseMutation.ts
import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';

type MutationFn<TData, TVariables> = (
  supabase: ReturnType<typeof createClient>,
  variables: TVariables
) => Promise<TData>;

interface UseSupabaseMutationOptions<TData, TVariables> extends Omit<
  UseMutationOptions<TData, PostgrestError, TVariables>,
  'mutationFn'
> {
  invalidateKeys?: readonly unknown[][];
}

export function useSupabaseMutation<TData, TVariables>(
  mutationFn: MutationFn<TData, TVariables>,
  options?: UseSupabaseMutationOptions<TData, TVariables>
) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation<TData, PostgrestError, TVariables>({
    mutationFn: (variables) => mutationFn(supabase, variables),
    onSuccess: (data, variables, context) => {
      // Invalidate specified query keys
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}
```

#### Optimistic Update Pattern

```typescript
// Example: Optimistic customer update
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';

export function useUpdateCustomer(shopId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (customer: UpdateCustomerInput) => {
      const { data, error } = await supabase
        .from('customers')
        .update(customer)
        .eq('id_customer', customer.id_customer)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    onMutate: async (newCustomer) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.customers.detail(shopId, newCustomer.id_customer),
      });

      // Snapshot previous value
      const previousCustomer = queryClient.getQueryData(
        queryKeys.customers.detail(shopId, newCustomer.id_customer)
      );

      // Optimistically update
      queryClient.setQueryData(
        queryKeys.customers.detail(shopId, newCustomer.id_customer),
        (old: Customer) => ({ ...old, ...newCustomer })
      );

      return { previousCustomer };
    },

    onError: (err, newCustomer, context) => {
      // Rollback on error
      if (context?.previousCustomer) {
        queryClient.setQueryData(
          queryKeys.customers.detail(shopId, newCustomer.id_customer),
          context.previousCustomer
        );
      }
    },

    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(shopId, variables.id_customer),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.list(shopId),
      });
    },
  });
}
```

### Real-time Integration

```typescript
// lib/hooks/data/useRealtime.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeOptions {
  channel: string;
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onPayload?: (payload: any) => void;
  invalidateKeys?: readonly unknown[][];
}

export function useRealtime({
  channel,
  table,
  filter,
  event = '*',
  onPayload,
  invalidateKeys,
}: UseRealtimeOptions) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    const channelInstance: RealtimeChannel = supabase
      .channel(channel)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          filter,
        },
        (payload) => {
          // Custom handler
          onPayload?.(payload);

          // Auto-invalidate queries
          if (invalidateKeys) {
            invalidateKeys.forEach((key) => {
              queryClient.invalidateQueries({ queryKey: key });
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelInstance);
    };
  }, [channel, table, filter, event]);
}

// Usage example:
// useRealtime({
//   channel: `inventory:${shopId}`,
//   table: 'inventory_items',
//   filter: `id_shop=eq.${shopId}`,
//   invalidateKeys: [queryKeys.inventory.all(shopId)],
// });
```

### Domain-Specific Query Hooks

```typescript
// lib/hooks/domain/useInventory.ts
import { useSupabaseQuery } from '../data/useSupabaseQuery';
import { queryKeys } from '@/lib/query/keys';

export function useInventoryItems(shopId: string, filters?: InventoryFilters) {
  return useSupabaseQuery(
    queryKeys.inventory.list(shopId, filters),
    async (supabase) => {
      let query = supabase
        .from('inventory_items')
        .select(
          `
          *,
          category:product_categories(id_category, category_name),
          metal_type:metal_types(id_metal_type, metal_name),
          metal_purity:metal_purities(id_purity, purity_name, fineness)
        `
        )
        .eq('id_shop', shopId)
        .is('deleted_at', null);

      // Apply filters
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.categoryId) query = query.eq('id_category', filters.categoryId);
      if (filters?.metalTypeId) query = query.eq('id_metal_type', filters.metalTypeId);
      if (filters?.search) query = query.ilike('item_name', `%${filters.search}%`);

      // Pagination
      if (filters?.page && filters?.pageSize) {
        const from = (filters.page - 1) * filters.pageSize;
        query = query.range(from, from + filters.pageSize - 1);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { items: data, totalCount: count };
    },
    {
      enabled: !!shopId,
    }
  );
}

export function useInventoryItem(shopId: string, itemId: string) {
  return useSupabaseQuery(
    queryKeys.inventory.detail(shopId, itemId),
    async (supabase) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(
          `
          *,
          category:product_categories(*),
          metal_type:metal_types(*),
          metal_purity:metal_purities(*),
          stones:item_stones(*, stone_type:stone_types(*)),
          certifications:item_certifications(*)
        `
        )
        .eq('id_item', itemId)
        .eq('id_shop', shopId)
        .single();
      if (error) throw error;
      return data;
    },
    {
      enabled: !!shopId && !!itemId,
    }
  );
}
```

### Provider Setup

```typescript
// app/providers.tsx
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query/client';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Store File Structure

```
/stores
├── shopStore.ts         # Current shop context (persisted)
├── uiStore.ts           # UI state - sidebar, theme, modals (persisted)
├── notificationStore.ts # Notification center (not persisted)
└── aiStore.ts           # AI conversation state (not persisted)

/lib/query
├── client.ts            # QueryClient configuration
└── keys.ts              # Query key factory

/lib/hooks
├── data/
│   ├── useSupabaseQuery.ts     # Base query hook
│   ├── useSupabaseMutation.ts  # Base mutation hook
│   └── useRealtime.ts          # Real-time subscription hook
└── domain/
    ├── useInventory.ts         # Inventory queries
    ├── useSales.ts             # Sales queries
    ├── useCustomers.ts         # Customer queries
    ├── useSuppliers.ts         # Supplier queries
    ├── usePurchases.ts         # Purchase queries
    ├── useWorkshops.ts         # Workshop queries
    ├── useExpenses.ts          # Expense queries
    ├── usePayroll.ts           # Payroll queries
    └── useAnalytics.ts         # Analytics queries
```

### State Management Rules

| State Type    | Where                    | Why                                        |
| ------------- | ------------------------ | ------------------------------------------ |
| Server data   | TanStack Query           | Caching, deduplication, background refresh |
| Current shop  | Zustand (persisted)      | Survives page refresh, needed early        |
| Theme/sidebar | Zustand (persisted)      | User preferences                           |
| Modal state   | Zustand (not persisted)  | Ephemeral UI state                         |
| Notifications | Zustand + TanStack Query | Cache in Query, UI state in Zustand        |
| URL filters   | nuqs                     | Shareable URLs, browser history            |
| Form state    | react-hook-form          | Form-specific, not global                  |

---

## i18n Setup (next-intl)

### File Structure

```
/lib/i18n/
├── routing.ts           # Locale configuration
├── navigation.ts        # Typed navigation helpers
├── request.ts           # Server-side locale loading
└── messages/
    ├── en.json          # English (default)
    ├── fr.json          # French
    ├── es.json          # Spanish
    ├── nl.json          # Dutch
    └── ar.json          # Arabic (RTL)

/middleware.ts           # Locale detection & routing
```

### Routing Configuration

```typescript
// lib/i18n/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'nl', 'ar'],
  defaultLocale: 'en',
  localeDetection: true,
  localePrefix: 'always', // URLs always have locale prefix
});

export const localeNames: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  nl: 'Nederlands',
  ar: 'العربية',
};

export const rtlLocales = ['ar'];
```

### Navigation Helpers

```typescript
// lib/i18n/navigation.ts
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Typed navigation that includes locale
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
```

### Middleware Setup

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/lib/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except API routes, static files, etc.
  matcher: ['/', '/(en|fr|es|nl|ar)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

### Server-Side Request Config

```typescript
// lib/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate locale
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
```

### Root Layout with RTL Support

```tsx
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import { rtlLocales } from '@/lib/i18n/routing';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const isRTL = rtlLocales.includes(locale);

  return (
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'}>
      <body>
        <AntdRegistry>
          <ConfigProvider direction={isRTL ? 'rtl' : 'ltr'}>
            <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
```

### Next.js Configuration

```typescript
// next.config.ts
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const nextConfig = {
  // other config...
};

export default withNextIntl(nextConfig);
```

### Component Usage Patterns

```tsx
// Client Component
'use client';
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('inventory');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('itemCount', { count: 5 })}</p>
    </div>
  );
}

// Server Component
import { getTranslations } from 'next-intl/server';

export async function ServerComponent() {
  const t = await getTranslations('inventory');

  return <h1>{t('title')}</h1>;
}
```

### Message File Structure

```json
// lib/i18n/messages/en.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "search": "Search",
    "loading": "Loading...",
    "noResults": "No results found"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "inventory": "Inventory",
    "sales": "Sales",
    "purchases": "Purchases",
    "workshops": "Workshops",
    "deliveries": "Deliveries",
    "expenses": "Expenses",
    "payroll": "Payroll",
    "analytics": "Analytics",
    "settings": "Settings"
  },
  "inventory": {
    "title": "Inventory",
    "itemCount": "{count, plural, =0 {No items} =1 {1 item} other {# items}}",
    "addItem": "Add Item",
    "filters": {
      "category": "Category",
      "metalType": "Metal Type",
      "status": "Status"
    }
  },
  "auth": {
    "login": "Log In",
    "logout": "Log Out",
    "register": "Register",
    "forgotPassword": "Forgot Password?"
  }
}
```

### Language Switcher Component

```tsx
// components/common/LanguageSwitcher.tsx
'use client';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/lib/i18n/navigation';
import { Select } from 'antd';
import { localeNames, routing } from '@/lib/i18n/routing';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <Select
      value={locale}
      onChange={handleChange}
      options={routing.locales.map((loc) => ({
        value: loc,
        label: localeNames[loc],
      }))}
    />
  );
}
```

### RTL CSS Overrides

```css
/* styles/rtl.css */
[dir='rtl'] {
  /* Sidebar on right */
  .sidebar {
    right: 0;
    left: auto;
  }

  /* Text alignment */
  .text-left {
    text-align: right;
  }

  /* Margins/paddings swap */
  .ml-4 {
    margin-left: 0;
    margin-right: 1rem;
  }

  /* Icons that need flipping */
  .icon-arrow-right {
    transform: scaleX(-1);
  }
}
```

### Ant Design Locale Integration

```tsx
// Combine next-intl with Ant Design locales
import enUS from 'antd/locale/en_US';
import frFR from 'antd/locale/fr_FR';
import esES from 'antd/locale/es_ES';
import nlNL from 'antd/locale/nl_NL';
import arEG from 'antd/locale/ar_EG';

const antdLocales = {
  en: enUS,
  fr: frFR,
  es: esES,
  nl: nlNL,
  ar: arEG
};

// In layout
<ConfigProvider
  locale={antdLocales[locale]}
  direction={isRTL ? 'rtl' : 'ltr'}
>
```

---

## Authentication Architecture

### Package Setup

```bash
# Use @supabase/ssr (NOT deprecated auth-helpers)
npm install @supabase/ssr @supabase/supabase-js
```

**Important**: The `@supabase/auth-helpers-nextjs` package is deprecated. Use `@supabase/ssr` for all new projects.

### File Structure

```
/lib/supabase/
├── client.ts            # Browser client (Client Components)
├── server.ts            # Server client (Server Components, Actions)
├── middleware.ts        # Session refresh logic
└── admin.ts             # Service role client (webhooks only)

/app/
├── (auth)/              # Auth route group (no layout chrome)
│   ├── login/
│   │   ├── page.tsx
│   │   └── actions.ts
│   ├── register/
│   │   ├── page.tsx
│   │   └── actions.ts
│   ├── forgot-password/
│   │   └── page.tsx
│   ├── reset-password/
│   │   └── page.tsx
│   ├── verify-email/
│   │   └── page.tsx
│   └── layout.tsx       # Split-screen auth layout
│
├── auth/
│   ├── callback/
│   │   └── route.ts     # OAuth & email confirmation callback
│   ├── confirm/
│   │   └── route.ts     # Email OTP verification
│   └── signout/
│       └── route.ts     # Sign out handler
│
└── middleware.ts        # Root middleware for session refresh

/lib/hooks/auth/
├── useUser.ts           # Current user data
├── useSession.ts        # Session state
└── useAuth.ts           # Auth actions (login, logout, etc.)
```

### Browser Client (Client Components)

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Server Client (Server Components & Actions)

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types/database';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component - ignore
            // Middleware handles session refresh
          }
        },
      },
    }
  );
}
```

### Middleware (Session Refresh)

```typescript
// lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Always use getUser() not getSession()
  // getUser() validates the JWT with Supabase Auth server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
```

### Root Middleware

```typescript
// middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/lib/i18n/routing';

// Public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/callback',
  '/auth/confirm',
];

// Create intl middleware
const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Refresh Supabase session
  const { supabaseResponse, user } = await updateSession(request);

  // Check if route is public (strip locale prefix for check)
  const pathWithoutLocale = pathname.replace(/^\/(en|fr|es|nl|ar)/, '') || '/';
  const isPublicRoute = publicRoutes.some((route) => pathWithoutLocale.startsWith(route));

  // Redirect unauthenticated users to login
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (user && isPublicRoute && pathWithoutLocale !== '/auth/callback') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Apply i18n middleware
  const intlResponse = intlMiddleware(request);

  // Merge cookies from Supabase response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie);
  });

  return intlResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

### Auth Callback Route (OAuth & Email Confirmation)

```typescript
// app/auth/callback/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    const errorUrl = new URL('/login', origin);
    errorUrl.searchParams.set('error', errorDescription || error);
    return NextResponse.redirect(errorUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful auth - redirect to intended destination
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // Something went wrong
  return NextResponse.redirect(new URL('/login?error=auth_error', origin));
}
```

### Email OTP Verification Route

```typescript
// app/auth/confirm/route.ts
import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/dashboard';

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete('token_hash');
  redirectTo.searchParams.delete('type');

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      redirectTo.searchParams.delete('next');
      return NextResponse.redirect(redirectTo);
    }
  }

  // Error - redirect to error page
  redirectTo.pathname = '/error';
  return NextResponse.redirect(redirectTo);
}
```

### Server Actions (Login/Register)

```typescript
// app/(auth)/login/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function login(formData: FormData) {
  const supabase = await createClient();

  const result = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { error } = await supabase.auth.signInWithPassword(result.data);

  if (error) {
    return { error: { _form: [error.message] } };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signInWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect(data.url);
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Redirect to verification page
  redirect('/verify-email?email=' + encodeURIComponent(email));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function resetPassword(email: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
```

### Auth Hooks

```typescript
// lib/hooks/auth/useUser.ts
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return { user, loading };
}
```

```typescript
// lib/hooks/auth/useAuth.ts
'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function useAuth() {
  const router = useRouter();
  const supabase = createClient();

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    router.refresh();
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  return { signIn, signInWithGoogle, signOut };
}
```

### Protected Server Component Pattern

```typescript
// Example: Getting user in Server Component
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const supabase = await createClient();

  // ALWAYS use getUser() for security
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // User is authenticated - fetch their data
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id_user', user.id)
    .single();

  return <Dashboard user={user} profile={profile} />;
}
```

### JWT Custom Claims (Multi-tenancy)

```typescript
// Database trigger to add shop_ids to JWT
// This is set up in Supabase SQL Editor

/*
-- Function to add shop_ids to JWT claims
CREATE OR REPLACE FUNCTION auth.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  claims jsonb;
  shop_ids uuid[];
BEGIN
  claims := event->'claims';

  -- Get user's shop IDs
  SELECT array_agg(id_shop) INTO shop_ids
  FROM shop_staff
  WHERE id_user = (event->>'user_id')::uuid
    AND status = 'active';

  -- Add shop_ids to claims
  claims := jsonb_set(claims, '{app_metadata, shop_ids}', to_jsonb(shop_ids));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Enable the hook in Supabase Dashboard > Authentication > Hooks
*/
```

### 2FA Support

```typescript
// lib/hooks/auth/useTwoFactor.ts
'use client';

import { createClient } from '@/lib/supabase/client';

export function useTwoFactor() {
  const supabase = createClient();

  const enrollTOTP = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App',
    });
    if (error) throw error;
    return data;
  };

  const verifyTOTP = async (factorId: string, code: string) => {
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (error) throw error;
    return data;
  };

  const unenroll = async (factorId: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw error;
  };

  const listFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    return data;
  };

  return { enrollTOTP, verifyTOTP, unenroll, listFactors };
}
```

### Security Best Practices

| Practice               | Implementation                                                 |
| ---------------------- | -------------------------------------------------------------- |
| Always use `getUser()` | Never trust `getSession()` on server - it doesn't validate JWT |
| PKCE flow              | Default for all auth methods (code exchange)                   |
| Secure cookies         | `httpOnly`, `secure`, `sameSite: 'lax'`                        |
| Session refresh        | Middleware refreshes tokens before they expire                 |
| Route protection       | Middleware redirects unauthenticated users                     |
| CSRF protection        | Supabase handles via secure cookies                            |
| Rate limiting          | Supabase Auth has built-in rate limits                         |

### Auth Configuration (Supabase Dashboard)

| Setting                | Value                                                                             |
| ---------------------- | --------------------------------------------------------------------------------- |
| Site URL               | `https://platform.aymur.com`                                                      |
| Redirect URLs          | `https://platform.aymur.com/auth/callback`, `http://localhost:3000/auth/callback` |
| JWT expiry             | 3600 (1 hour)                                                                     |
| Refresh token rotation | Enabled                                                                           |
| Email confirmations    | Required                                                                          |
| Password requirements  | Min 8 chars                                                                       |
| OAuth providers        | Google (configured)                                                               |

---

## Key Architecture Decisions

### 1. Multi-Tenancy

- Route pattern: `/[locale]/[shopId]/...`
- Shop context via Zustand store
- JWT contains `shop_ids[]` in `app_metadata`
- All queries include `id_shop` for RLS

### 2. Real-time Updates

```typescript
// Supabase Realtime channels
const channels = {
  inventory: `inventory:${shopId}`,
  sales: `sales:${shopId}`,
  customers: `customers:${shopId}`,
  notifications: `notifications:${userId}`,
};
```

### 3. Server-Side Pagination

```typescript
// All data tables use server-side pagination
interface PaginationParams {
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}
```

### 4. Form Pattern (Modal Dialogs)

```typescript
// All create/edit forms use modal pattern
<Modal open={open} onClose={onClose}>
  <Form onSubmit={handleSubmit}>
    {/* Form fields */}
  </Form>
</Modal>
```

### 5. Permission Checks

```typescript
// Client-side permission hook
const { can } = usePermissions();

if (can('sales.create')) {
  // Show create button
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

- [ ] Next.js project setup with TypeScript
- [ ] Ant Design + Tailwind configuration
- [ ] Supabase client setup
- [ ] Authentication flow (login, register, forgot password)
- [ ] Base layout (sidebar + header)
- [ ] i18n setup with all 5 languages
- [ ] Theme configuration (gold tones)

### Phase 2: Core Modules (Week 3-6)

- [ ] Dashboard with key metrics
- [ ] Inventory management (items, categories, metals, stones)
- [ ] Sales management (transactions, customers, payments)
- [ ] Purchase management (orders, suppliers, payments)
- [ ] Real-time subscriptions for inventory/balances

### Phase 3: Extended Modules (Week 7-10)

- [ ] Workshop orders management
- [ ] Delivery & courier management
- [ ] Expense management with budgets
- [ ] Payroll management

### Phase 4: Advanced Features (Week 11-14)

- [ ] Analytics dashboards
- [ ] AI assistant integration
- [ ] PDF/Excel export
- [ ] Print functionality
- [ ] Notification center

### Phase 5: Polish & Launch (Week 15-16)

- [ ] Performance optimization
- [ ] E2E testing
- [ ] Storybook documentation
- [ ] Sentry integration
- [ ] Production deployment

---

## File: Critical Files to Create

```
# Configuration
next.config.ts
tailwind.config.ts
tsconfig.json
package.json
.env.local
.env.example

# Supabase
lib/supabase/client.ts
lib/supabase/server.ts
lib/supabase/middleware.ts
lib/types/database.ts          # Generated types

# Auth
app/(auth)/layout.tsx
app/(auth)/login/page.tsx
app/(auth)/register/page.tsx
middleware.ts                   # Auth middleware

# Platform Layout
app/(platform)/[locale]/[shopId]/layout.tsx
components/layout/Sidebar.tsx
components/layout/Header.tsx
components/layout/ShopSwitcher.tsx

# Stores
stores/shopStore.ts
stores/uiStore.ts

# Theme
styles/antd-theme.ts
styles/globals.css
```

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

OPENAI_API_KEY=

SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

NEXT_PUBLIC_APP_URL=https://platform.aymur.com
NEXT_PUBLIC_MARKETING_URL=https://aymur.com
```

---

---

## Business Rules & Constraints

### Authentication & Security

| Rule                  | Value                             |
| --------------------- | --------------------------------- |
| OTP Provider          | Twilio                            |
| 2FA Methods           | Both (Authenticator app + SMS)    |
| Session Duration      | 24 hours before re-login          |
| Password Requirements | 8+ characters, mixed case, number |
| Account Recovery      | Email-based reset flow            |

### Subscription & Billing

| Rule                 | Value                                             |
| -------------------- | ------------------------------------------------- |
| Plan Model           | Paid only (no free tier)                          |
| Billing Cycles       | Monthly + Annual (annual discount)                |
| Limit Enforcement    | Hard block when reached                           |
| Payment Grace Period | 3 days for failed payments                        |
| Currency             | Set at shop creation, cannot be changed           |
| Downgrade Handling   | Follow database constraints (block if over limit) |

### Subscription Plans

| Plan             | Price         | Shops  | Extra Roles | Storage | AI Credits |
| ---------------- | ------------- | ------ | ----------- | ------- | ---------- |
| **Professional** | €149/mo       | 1      | 1           | 30 GB   | 3,000/mo   |
| **Business**     | €349/mo       | 2      | 4           | 70 GB   | 7,000/mo   |
| **Enterprise**   | Contact Sales | Custom | Custom      | Custom  | Custom     |

### Inventory & Products

| Rule             | Value                                                   |
| ---------------- | ------------------------------------------------------- |
| Images per Item  | Up to 3                                                 |
| Pricing          | Manual entry at sale, purchase price shown as reference |
| Barcodes         | Generate new or scan existing                           |
| SKU              | System-generated unique codes                           |
| Stock Alerts     | Per-category thresholds                                 |
| Image Processing | Auto-resize to fit app dimensions                       |

### Barcode & Labels

| Setting        | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| Default Format | Code 128                                                                 |
| Format Options | Configurable in settings (Code 128, EAN-13, QR)                          |
| Encoded Data   | SKU only                                                                 |
| Label Size     | Small jewelry tags (10x30mm)                                             |
| Printer Type   | Thermal printer support                                                  |
| Label Content  | Customizable (shop chooses: barcode, price, metal, weight, purity, etc.) |
| Generation     | On item creation + bulk print option                                     |

### Sales & POS

| Rule            | Value                                                  |
| --------------- | ------------------------------------------------------ |
| Payment Methods | Follow database (cash, card, credit, cheque, transfer) |
| Discounts       | No discount system - manual price entry                |
| Returns         | Follow database (basic sale reversal)                  |
| Credit Limits   | Warning only (show warning but allow override)         |
| Sale Price      | Manual entry with purchase price shown as reference    |
| Sold Items      | Status → 'sold', archived, linked to sale record       |
| Reservations    | Follow database (basic status change)                  |
| Consignment     | Follow database (ownership_type field tracking)        |

### Metal Prices

| Setting             | Value                                     |
| ------------------- | ----------------------------------------- |
| API Provider        | Metals-API (free tier available)          |
| Update Frequency    | Daily                                     |
| Dashboard Widget    | Real-time prices display                  |
| Price Suggestions   | Suggest sale price (weight × metal price) |
| Inventory Valuation | Calculate total inventory value           |
| Currencies          | Based on shop currency setting            |

### System Features

| Feature        | Visibility                                       |
| -------------- | ------------------------------------------------ |
| Audit Logs     | Backend only (not in UI)                         |
| Shop Reset     | In settings, owner only, multi-step confirmation |
| Certifications | Follow database (item_certifications)            |
| Stone Details  | Follow database (item_stones)                    |
| Reminders      | Multiple types per database structure            |

### Workshop Services

| Service Type | Description               |
| ------------ | ------------------------- |
| Repair       | Fix damaged items         |
| Resize       | Adjust ring/bracelet size |
| Custom       | Custom jewelry creation   |
| Cleaning     | Professional cleaning     |
| Engraving    | Custom engraving          |

### Staff & Payroll

| Rule           | Value                            |
| -------------- | -------------------------------- |
| Commission     | Configurable per staff member    |
| Salary Types   | Fixed, commission, or hybrid     |
| Leave Tracking | Not in scope (external system)   |
| Non-app Staff  | Support staff without app access |

### AI Assistant

| Capability        | Details                                               |
| ----------------- | ----------------------------------------------------- |
| Model             | Configurable (GPT-4, GPT-3.5, Claude)                 |
| Permissions       | Hard-coded to match user permissions                  |
| Vision            | Image understanding enabled                           |
| Context Awareness | Opt-in via "Share with AI" button                     |
| Language          | Responds in user's preferred language                 |
| Actions           | Role-based: auto for reads, approval for writes       |
| Token Efficiency  | On-demand (✨ button), optimized prompts, caching     |
| Memory            | Persistent conversation history                       |
| UI                | Floating bubble + dedicated /ai page                  |
| Page Integration  | ✨ sparkle buttons on Dashboard, Inventory, Analytics |
| POS               | No AI features (keep simple)                          |

### File Storage

| Rule             | Value                        |
| ---------------- | ---------------------------- |
| Max File Size    | 5 MB                         |
| Image Processing | Auto-resize/optimize for app |
| Allowed Types    | Images, PDFs, documents      |
| Storage          | Supabase Storage with RLS    |

### Address Autocomplete

| Rule     | Value                                                        |
| -------- | ------------------------------------------------------------ |
| Provider | Google Places API                                            |
| Usage    | Everywhere (shop, customers, suppliers, deliveries, profile) |
| Fields   | Street, City, Province/State, Country, Postal Code           |
| Behavior | Autocomplete dropdown with structured address parsing        |
| Fallback | Manual entry if API unavailable                              |

### Phone Number Handling

| Rule       | Value                                  |
| ---------- | -------------------------------------- |
| Provider   | Twilio Lookup API                      |
| Validation | Format validation + carrier lookup     |
| Display    | International format with country flag |
| Input      | Country code dropdown + number field   |
| OTP        | Uses same Twilio account               |

### Notifications

| Rule                | Value                              |
| ------------------- | ---------------------------------- |
| In-app Events       | User configurable                  |
| Push Notifications  | Optional (user enables)            |
| Email Notifications | Via Supabase Edge Functions + SMTP |
| Scheduled Reports   | Not included                       |

### Transactional Emails

| Rule          | Value                                                   |
| ------------- | ------------------------------------------------------- |
| Provider      | Supabase Edge Functions + SMTP                          |
| Auth Emails   | Handled by Supabase Auth (password reset, verification) |
| Templates     | Fixed system templates (shop logo/name auto-inserted)   |
| Customization | None (standard templates only)                          |

**Email Types Sent:**

| Category         | Emails                                             |
| ---------------- | -------------------------------------------------- |
| **Auth**         | Password reset, email verification (Supabase Auth) |
| **Invoices**     | Sale receipts, purchase invoices to customers      |
| **Alerts**       | Payment reminders, stock alerts, low inventory     |
| **Staff**        | Staff invitations, role changes                    |
| **Subscription** | Payment receipts, plan changes, limit warnings     |

### Data & Performance

| Rule             | Value                                       |
| ---------------- | ------------------------------------------- |
| Data Volume      | Variable (optimize for all sizes)           |
| Offline Behavior | Show error, block actions                   |
| Data Export      | On request (support contact)                |
| Data Import      | Later phase (CSV import planned for future) |
| Reports          | Pre-calculated in DB for fast UI            |
| Default Catalog  | Follow database setup defaults              |

### Accessibility

| Rule           | Value                               |
| -------------- | ----------------------------------- |
| Standard       | Best effort (follow best practices) |
| Screen Readers | Basic support                       |
| Keyboard Nav   | Essential features                  |
| Color Contrast | Follow design system                |

---

## Permission & Role-Based UI

### Permission Handling

| Scenario                | UI Behavior                                |
| ----------------------- | ------------------------------------------ |
| Feature not permitted   | Show with lock icon                        |
| Click on locked feature | Show inline message explaining restriction |
| Admin contact           | No contact prompt (just show limitation)   |
| Navigation items        | Show locked items, don't hide              |

### Role Hierarchy (from database)

```
Owner (Level 1)     → Full access to everything
Manager (Level 2)   → Staff management, expense approval, analytics
Finance (Level 3)   → Payroll, salary, financial reports
Staff (Level 4)     → Sales, customer management, basic operations
```

### Permission Check Flow

```typescript
// Frontend permission check
const { can, role } = usePermissions();

// UI rendering
{can('sales.create') ? (
  <Button>New Sale</Button>
) : (
  <LockedButton tooltip="You don't have permission for this action" />
)}
```

### Locked Feature Component

```tsx
<LockedFeature permission="expenses.approve">
  <ApproveExpenseButton />
</LockedFeature>

// Renders:
// - Normal button if permitted
// - Locked button with inline message if not
```

---

## Error Handling Strategy

### Error Types & Responses

| Error Type         | UI Response                                   |
| ------------------ | --------------------------------------------- |
| Network error      | Toast + Retry button + Auto-retry (2-3 times) |
| API error          | User-friendly toast message                   |
| Validation error   | Highlight fields + Scroll to first error      |
| Permission denied  | Inline feedback near blocked element          |
| Not found (404)    | Full page error with navigation               |
| Server error (500) | Full page error with retry                    |
| Concurrent edit    | Modal showing both versions                   |

### Error Message Format

```
Simple, user-friendly messages only:
✓ "Unable to save. Please try again."
✓ "Item not found."
✓ "You don't have access to this feature."

NOT:
✗ "Error 500: Internal server error at /api/sales"
✗ "RLS policy violation for shop_id"
```

### Network Error Flow

```
1. Request fails
2. Auto-retry (up to 3 times with backoff)
3. If still fails:
   - Show error toast
   - Show "Retry" button
   - Keep current data visible
```

### Form Validation

```
Timing: On submit only
Display: Highlight invalid fields + scroll to first
Recovery: Clear error when field is corrected
Submit: Disable button during submission
```

### Concurrent Edit Handling

```
1. User A opens item (version: 1)
2. User B saves item (version: 2)
3. User A tries to save
4. System detects version mismatch
5. Show modal:
   ┌─────────────────────────────────────┐
   │ This record was modified            │
   │                                     │
   │ Your changes:        Other changes: │
   │ [diff view]          [diff view]    │
   │                                     │
   │ [Keep Mine] [Use Theirs] [Cancel]  │
   └─────────────────────────────────────┘
```

### Empty State Error Messages

```
No items: "No items yet. Add your first item to get started."
No results: "No results match your filters. Try adjusting your search."
No access: "You don't have access to this section."
```

---

## Marketing Site (aymur.com)

### MVP Scope

- **Phase 1 (MVP)**: Platform only (`platform.aymur.com`)
- **Phase 2 (Post-MVP)**: Add marketing site (`aymur.com`)
- **Temporary**: `aymur.com` redirects to `platform.aymur.com/login`

### Future Architecture (Post-MVP)

- **Approach**: Monorepo (same repo as platform)
- **Framework**: Next.js with route groups
- **Deployment**: Vercel (same project)

### Future Pages

```
/ (Home)
/features
/pricing
/contact
/login → redirects to platform.aymur.com
/register → redirects to platform.aymur.com
```

### Help/Documentation

- In-app help only
- No separate docs site
- Tooltips and guided tours
- FAQ section in settings

---

## Data Constraints from Database

### Multi-tenancy

- All data isolated by `id_shop`
- JWT contains `shop_ids[]` in `app_metadata`
- RLS enforced at database level (147 policies)

### Immutable Ledgers (9 tables)

Cannot UPDATE or DELETE:

- customer_transactions
- supplier_transactions
- courier_transactions
- workshop_transactions
- shop_transfer_transactions
- shop_transfer_settlements
- budget_transactions
- ai_token_usage
- audits_logs

### Soft Deletes

- Most entities use `deleted_at` timestamp
- Never hard delete business data
- Filter with `WHERE deleted_at IS NULL`

### Optimistic Locking

- `version` column on key tables
- Increment on update
- Prevent concurrent edit conflicts

### Status Transitions

Enforced by triggers:

- Sales: pending → completed (no regression)
- Inventory: available → sold/reserved/workshop
- Workshop: pending → accepted → in_progress → completed → delivered
- Deliveries: pending → shipped → in_transit → delivered/failed/returned

### Balance Tracking

Automatic sync triggers:

- `customers.current_balance` ← customer_transactions
- `suppliers.current_balance` ← supplier_transactions
- `courier_companies.current_balance` ← courier_transactions
- `workshops.current_balance` ← workshop_transactions

---

## Development Environment

| Setting         | Value                                     |
| --------------- | ----------------------------------------- |
| Supabase        | Production only (single project)          |
| Local Dev       | Use Supabase CLI for local development    |
| Branching       | Supabase branches for feature development |
| Staging         | No separate staging project               |
| Type Generation | `supabase gen types typescript`           |

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Twilio (OTP + Lookup)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Google Places API
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=

# Metals API (metal prices)
METALS_API_KEY=

# AI (Configurable)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Sentry
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# SMTP (for transactional emails)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM_EMAIL=noreply@aymur.com

# URLs
NEXT_PUBLIC_APP_URL=https://platform.aymur.com
NEXT_PUBLIC_MARKETING_URL=https://aymur.com
```
