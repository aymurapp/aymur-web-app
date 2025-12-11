/**
 * Stripe Server-Side Integration
 *
 * Server-only utilities for Stripe payment processing and subscription management.
 *
 * ============================================================================
 * WARNING: SERVER-ONLY CODE
 * ============================================================================
 *
 * This module should ONLY be used in:
 * - API Route Handlers (/app/api/*)
 * - Server Actions ('use server')
 * - Webhook handlers
 *
 * NEVER:
 * - Import this in client components
 * - Import this in files that run in the browser
 * - Expose the secret key to the client
 *
 * For client-side Stripe integration (Stripe Elements, etc.), use @stripe/stripe-js
 * with NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
 *
 * @module lib/stripe
 */

import Stripe from 'stripe';

// Cached Stripe client instance (lazy initialization)
let stripeClient: Stripe | null = null;

/**
 * Gets the server-side Stripe client instance (lazy initialization).
 *
 * This function uses lazy initialization to avoid throwing errors during
 * the Next.js build phase when environment variables may not be available.
 * The client is created on first use and cached for subsequent calls.
 *
 * @returns The Stripe client instance
 * @throws {Error} If STRIPE_SECRET_KEY is not configured (at runtime)
 */
export function getStripe(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY is not configured. ' +
        'This key is required for Stripe operations and should only be used server-side.'
    );
  }

  // SDK v20+ automatically uses the correct API version for its TypeScript types
  // See: https://docs.stripe.com/sdks/set-version#node
  stripeClient = new Stripe(secretKey);

  return stripeClient;
}

/**
 * Verifies a Stripe webhook signature and constructs the event.
 *
 * This function validates that a webhook request came from Stripe by
 * verifying the signature in the Stripe-Signature header against the
 * webhook endpoint secret.
 *
 * Security considerations:
 * - Always verify signatures to prevent spoofed webhook events
 * - Use the raw request body (not parsed JSON) for verification
 * - Keep the webhook secret secure and never expose it client-side
 *
 * @param payload - The raw request body as a string or Buffer
 * @param signature - The value of the Stripe-Signature header
 * @returns The verified Stripe event object
 * @throws {Stripe.errors.StripeSignatureVerificationError} If signature verification fails
 * @throws {Error} If STRIPE_WEBHOOK_SECRET is not configured
 *
 * @example
 * ```typescript
 * // In an API route handler
 * import { verifyWebhookSignature } from '@/lib/stripe';
 *
 * export async function POST(request: Request) {
 *   const body = await request.text();
 *   const signature = request.headers.get('stripe-signature')!;
 *
 *   try {
 *     const event = verifyWebhookSignature(body, signature);
 *     // Handle the event...
 *   } catch (error) {
 *     return new Response('Webhook signature verification failed', { status: 400 });
 *   }
 * }
 * ```
 */
export function verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is not configured. ' +
        'This secret is required for webhook signature verification.'
    );
  }

  return getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Creates a Stripe Customer Portal session.
 *
 * The Customer Portal allows customers to manage their subscriptions,
 * update payment methods, view invoices, and cancel subscriptions
 * without requiring custom UI implementation.
 *
 * Prerequisites:
 * - Configure the Customer Portal in the Stripe Dashboard
 * - Customer must have a valid Stripe customer ID
 *
 * @param customerId - The Stripe customer ID (cus_xxx)
 * @param returnUrl - The URL to redirect to after the customer leaves the portal
 * @returns The URL of the Customer Portal session
 *
 * @example
 * ```typescript
 * // In a server action
 * import { createPortalSession } from '@/lib/stripe';
 *
 * export async function redirectToPortal(customerId: string) {
 *   const portalUrl = await createPortalSession(
 *     customerId,
 *     'https://yourapp.com/settings/billing'
 *   );
 *   redirect(portalUrl);
 * }
 * ```
 */
export async function createPortalSession(customerId: string, returnUrl: string): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Creates a Stripe Checkout session for subscription purchases.
 *
 * Checkout provides a Stripe-hosted payment page that handles:
 * - Payment form UI
 * - Card validation
 * - 3D Secure authentication
 * - Mobile-optimized experience
 *
 * The session URL expires after 24 hours if not completed.
 *
 * @param priceId - The Stripe price ID (price_xxx) for the subscription
 * @param customerId - The Stripe customer ID (cus_xxx)
 * @param successUrl - The URL to redirect to after successful payment
 * @param cancelUrl - The URL to redirect to if the customer cancels
 * @returns The URL of the Checkout session
 *
 * @example
 * ```typescript
 * // In a server action
 * import { createCheckoutSession } from '@/lib/stripe';
 *
 * export async function startSubscription(priceId: string, customerId: string) {
 *   const checkoutUrl = await createCheckoutSession(
 *     priceId,
 *     customerId,
 *     'https://yourapp.com/subscription/success',
 *     'https://yourapp.com/subscription/canceled'
 *   );
 *   redirect(checkoutUrl);
 * }
 * ```
 */
export async function createCheckoutSession(
  priceId: string,
  customerId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    // Allow promotion codes for discounts
    allow_promotion_codes: true,
    // Collect billing address for tax purposes
    billing_address_collection: 'required',
  });

  if (!session.url) {
    throw new Error('Failed to create checkout session: No URL returned');
  }

  return session.url;
}
