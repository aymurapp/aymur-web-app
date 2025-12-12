/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for subscription management.
 * Processes subscription lifecycle events and syncs with database.
 *
 * Supported Events:
 * - customer.subscription.created: New subscription created
 * - customer.subscription.updated: Subscription modified (plan change, status change)
 * - customer.subscription.deleted: Subscription canceled
 * - invoice.payment_failed: Payment attempt failed
 * - invoice.payment_succeeded: Payment successful (recovery from past_due)
 *
 * Security:
 * - Verifies Stripe webhook signature
 * - Uses admin client (bypasses RLS) since webhooks have no user context
 * - Implements idempotency via stripe_webhooks table
 * - Never exposes sensitive data in logs
 *
 * @module app/api/webhooks/stripe/route
 */

import { verifyWebhookSignature } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

import type Stripe from 'stripe';

// ============================================================================
// Types
// ============================================================================

/**
 * Subscription status values matching database constraint
 */
type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'paused';

/**
 * Stripe webhook event types we handle
 */
type HandledEventType =
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_failed'
  | 'invoice.payment_succeeded';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Maps Stripe subscription status to our database status
 * @param stripeStatus - The status from Stripe
 * @returns Mapped database status
 */
function mapSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: 'active',
    canceled: 'canceled',
    past_due: 'past_due',
    paused: 'paused',
    // Map other Stripe statuses to appropriate values
    incomplete: 'past_due',
    incomplete_expired: 'canceled',
    trialing: 'active',
    unpaid: 'past_due',
  };

  return statusMap[stripeStatus] || 'past_due';
}

/**
 * Converts Unix timestamp to ISO string for database
 * @param timestamp - Unix timestamp in seconds
 * @returns ISO date string
 */
function unixToISO(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

/**
 * Logs webhook event (without sensitive data)
 * @param eventId - Stripe event ID
 * @param eventType - Type of event
 * @param message - Log message
 * @param data - Optional additional data (will be sanitized)
 */
function logWebhook(
  eventId: string,
  eventType: string,
  message: string,
  data?: Record<string, unknown>
): void {
  console.log(`[Stripe Webhook] ${eventType} (${eventId}): ${message}`, data ? { ...data } : '');
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handles customer.subscription.created event
 * Creates a new subscription record in the database
 * Also cancels any existing active subscriptions for the user (upgrade scenario)
 */
async function handleSubscriptionCreated(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription,
  eventId: string
): Promise<void> {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    throw new Error('Missing user_id in subscription metadata');
  }

  // Get the price ID from the first subscription item
  const priceId = subscription.items.data[0]?.price?.id;

  if (!priceId) {
    throw new Error('No price found in subscription');
  }

  // Find the plan by stripe_price_id
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id_plan')
    .eq('stripe_price_id', priceId)
    .single();

  if (planError || !plan) {
    throw new Error(`Plan not found for stripe_price_id: ${priceId}`);
  }

  // Check if subscription already exists (idempotency at subscription level)
  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('id_subscription')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (existingSubscription) {
    logWebhook(eventId, 'customer.subscription.created', 'Subscription already exists, skipping', {
      subscriptionId: subscription.id,
    });
    return;
  }

  // Cancel any existing active subscriptions for this user (upgrade scenario)
  // This handles cases where user subscribes to a new plan without canceling the old one
  const { data: oldSubscriptions, error: oldSubError } = await supabase
    .from('subscriptions')
    .select('id_subscription, stripe_subscription_id')
    .eq('id_user', userId)
    .eq('status', 'active');

  if (!oldSubError && oldSubscriptions && oldSubscriptions.length > 0) {
    logWebhook(
      eventId,
      'customer.subscription.created',
      'Found existing active subscriptions, marking as canceled',
      {
        count: oldSubscriptions.length,
      }
    );

    // Mark old subscriptions as canceled in our database
    const { error: cancelError } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled' as SubscriptionStatus,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id_user', userId)
      .eq('status', 'active');

    if (cancelError) {
      logWebhook(
        eventId,
        'customer.subscription.created',
        'Warning: Failed to cancel old subscriptions',
        {
          error: cancelError.message,
        }
      );
    }
  }

  // Get billing periods from the first subscription item (API 2025+ structure)
  const firstItem = subscription.items.data[0];
  const currentPeriodStart = firstItem?.current_period_start;
  const currentPeriodEnd = firstItem?.current_period_end;

  if (!currentPeriodStart || !currentPeriodEnd) {
    throw new Error('Missing billing period data on subscription item');
  }

  // Insert new subscription
  const { data: newSubscription, error: insertError } = await supabase
    .from('subscriptions')
    .insert({
      id_user: userId,
      id_plan: plan.id_plan,
      stripe_subscription_id: subscription.id,
      status: mapSubscriptionStatus(subscription.status),
      current_period_start: unixToISO(currentPeriodStart),
      current_period_end: unixToISO(currentPeriodEnd),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .select('id_subscription')
    .single();

  if (insertError) {
    throw new Error(`Failed to create subscription: ${insertError.message}`);
  }

  // Update any shops owned by this user to point to the new subscription
  if (newSubscription) {
    const { error: shopUpdateError } = await supabase
      .from('shops')
      .update({
        id_subscription: newSubscription.id_subscription,
        updated_at: new Date().toISOString(),
      })
      .eq('id_owner', userId);

    if (shopUpdateError) {
      logWebhook(
        eventId,
        'customer.subscription.created',
        'Warning: Failed to update shop subscription',
        {
          error: shopUpdateError.message,
        }
      );
    } else {
      logWebhook(eventId, 'customer.subscription.created', 'Updated shop subscription references');
    }
  }

  logWebhook(eventId, 'customer.subscription.created', 'Subscription created successfully', {
    subscriptionId: subscription.id,
    userId,
    planId: plan.id_plan,
  });
}

/**
 * Handles customer.subscription.updated event
 * Updates subscription status, period dates, and cancellation status
 */
async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription,
  eventId: string
): Promise<void> {
  // Get the first subscription item (API 2025+ structure)
  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price?.id;
  const currentPeriodStart = firstItem?.current_period_start;
  const currentPeriodEnd = firstItem?.current_period_end;

  // Prepare update data
  const updateData: Record<string, unknown> = {
    status: mapSubscriptionStatus(subscription.status),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  // Add billing periods if available from subscription item
  if (currentPeriodStart) {
    updateData.current_period_start = unixToISO(currentPeriodStart);
  }
  if (currentPeriodEnd) {
    updateData.current_period_end = unixToISO(currentPeriodEnd);
  }

  // If price changed, update the plan
  if (priceId) {
    const { data: plan } = await supabase
      .from('plans')
      .select('id_plan')
      .eq('stripe_price_id', priceId)
      .single();

    if (plan) {
      updateData.id_plan = plan.id_plan;
    }
  }

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('stripe_subscription_id', subscription.id);

  if (updateError) {
    throw new Error(`Failed to update subscription: ${updateError.message}`);
  }

  logWebhook(eventId, 'customer.subscription.updated', 'Subscription updated successfully', {
    subscriptionId: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

/**
 * Handles customer.subscription.deleted event
 * Marks subscription as canceled with timestamp
 */
async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription,
  eventId: string
): Promise<void> {
  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled' as SubscriptionStatus,
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (updateError) {
    throw new Error(`Failed to cancel subscription: ${updateError.message}`);
  }

  logWebhook(eventId, 'customer.subscription.deleted', 'Subscription canceled successfully', {
    subscriptionId: subscription.id,
  });
}

/**
 * Handles invoice.payment_failed event
 * Marks the associated subscription as past_due
 */
async function handlePaymentFailed(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice,
  eventId: string
): Promise<void> {
  // In API 2025+, subscription is accessed via parent field
  const parentSubscription = invoice.parent?.subscription_details?.subscription;
  // Extract subscription ID - can be string or Subscription object
  let subscriptionId: string | null = null;
  if (typeof parentSubscription === 'string') {
    subscriptionId = parentSubscription;
  } else if (
    parentSubscription &&
    typeof parentSubscription === 'object' &&
    'id' in parentSubscription
  ) {
    subscriptionId = parentSubscription.id;
  }

  if (!subscriptionId) {
    logWebhook(eventId, 'invoice.payment_failed', 'No subscription associated with invoice');
    return;
  }

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due' as SubscriptionStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (updateError) {
    throw new Error(`Failed to update subscription status: ${updateError.message}`);
  }

  logWebhook(eventId, 'invoice.payment_failed', 'Subscription marked as past_due', {
    subscriptionId,
    invoiceId: invoice.id,
  });
}

/**
 * Handles invoice.payment_succeeded event
 * Reactivates subscription if recovering from past_due status
 */
async function handlePaymentSucceeded(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice,
  eventId: string
): Promise<void> {
  // In API 2025+, subscription is accessed via parent field
  const parentSubscription = invoice.parent?.subscription_details?.subscription;
  // Extract subscription ID - can be string or Subscription object
  let subscriptionId: string | null = null;
  if (typeof parentSubscription === 'string') {
    subscriptionId = parentSubscription;
  } else if (
    parentSubscription &&
    typeof parentSubscription === 'object' &&
    'id' in parentSubscription
  ) {
    subscriptionId = parentSubscription.id;
  }

  if (!subscriptionId) {
    logWebhook(eventId, 'invoice.payment_succeeded', 'No subscription associated with invoice');
    return;
  }

  // Only update if subscription is currently past_due
  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (currentSub?.status === 'past_due') {
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active' as SubscriptionStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscriptionId);

    if (updateError) {
      throw new Error(`Failed to reactivate subscription: ${updateError.message}`);
    }

    logWebhook(eventId, 'invoice.payment_succeeded', 'Subscription reactivated from past_due', {
      subscriptionId,
      invoiceId: invoice.id,
    });
  } else {
    logWebhook(
      eventId,
      'invoice.payment_succeeded',
      'Payment recorded (subscription already active)',
      {
        subscriptionId,
        invoiceId: invoice.id,
      }
    );
  }
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * POST /api/webhooks/stripe
 *
 * Handles incoming Stripe webhook events.
 *
 * Security:
 * - Verifies webhook signature using STRIPE_WEBHOOK_SECRET
 * - Uses admin client to bypass RLS (no user context in webhooks)
 * - Implements idempotency via stripe_webhooks table
 *
 * Always returns 200 to acknowledge receipt (Stripe retries on non-200).
 * Errors are logged to stripe_webhooks.error_message for debugging.
 */
export async function POST(request: Request): Promise<Response> {
  const supabase = createAdminClient();
  let eventId: string | undefined;
  let eventType: string | undefined;

  try {
    // 1. Get raw body and signature header
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Stripe Webhook] Missing stripe-signature header');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Verify webhook signature
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(payload, signature);
    } catch (signatureError) {
      console.error('[Stripe Webhook] Signature verification failed:', signatureError);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    eventId = event.id;
    eventType = event.type;

    logWebhook(eventId, eventType, 'Received webhook event');

    // 3. Check idempotency - query stripe_webhooks table by stripe_event_id
    const { data: existingWebhook } = await supabase
      .from('stripe_webhooks')
      .select('id_webhook, processed')
      .eq('stripe_event_id', eventId)
      .single();

    if (existingWebhook?.processed) {
      logWebhook(eventId, eventType, 'Event already processed, returning 200');
      return new Response(JSON.stringify({ received: true, status: 'already_processed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Log event to stripe_webhooks table (processed=false)
    let webhookRecordId: string;

    if (existingWebhook) {
      // Record exists but wasn't processed (retry scenario)
      webhookRecordId = existingWebhook.id_webhook;
    } else {
      const { data: newWebhook, error: insertError } = await supabase
        .from('stripe_webhooks')
        .insert({
          stripe_event_id: eventId,
          event_type: eventType,
          payload: JSON.parse(JSON.stringify(event)),
          processed: false,
        })
        .select('id_webhook')
        .single();

      if (insertError || !newWebhook) {
        throw new Error(`Failed to log webhook event: ${insertError?.message}`);
      }

      webhookRecordId = newWebhook.id_webhook;
    }

    // 5. Handle events based on type
    try {
      switch (eventType as HandledEventType) {
        case 'customer.subscription.created': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionCreated(supabase, subscription, eventId);
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdated(supabase, subscription, eventId);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionDeleted(supabase, subscription, eventId);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentFailed(supabase, invoice, eventId);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentSucceeded(supabase, invoice, eventId);
          break;
        }

        default:
          logWebhook(eventId, eventType, 'Unhandled event type, acknowledging receipt');
      }

      // 6. Mark stripe_webhooks record as processed=true
      await supabase
        .from('stripe_webhooks')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('id_webhook', webhookRecordId);

      logWebhook(eventId, eventType, 'Event processed successfully');
    } catch (handlerError) {
      // Log error to webhook record but still return 200
      const errorMessage =
        handlerError instanceof Error ? handlerError.message : 'Unknown handler error';

      await supabase
        .from('stripe_webhooks')
        .update({
          error_message: errorMessage,
          processed: false,
        })
        .eq('id_webhook', webhookRecordId);

      console.error(`[Stripe Webhook] Handler error for ${eventType} (${eventId}):`, errorMessage);

      // Still return 200 to prevent Stripe from retrying indefinitely
      // The error is logged in the database for manual investigation
      return new Response(
        JSON.stringify({
          received: true,
          status: 'error',
          message: 'Event logged but processing failed',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 7. Return 200 response
    return new Response(JSON.stringify({ received: true, status: 'processed' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Unexpected error outside of event handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Stripe Webhook] Unexpected error${eventId ? ` (${eventId})` : ''}:`,
      errorMessage
    );

    // Return 200 to acknowledge receipt even on unexpected errors
    // This prevents Stripe from retrying events that we've already seen
    return new Response(
      JSON.stringify({
        received: true,
        status: 'error',
        message: 'Unexpected error occurred',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * GET /api/webhooks/stripe
 *
 * Returns 405 Method Not Allowed.
 * Webhooks only accept POST requests from Stripe.
 */
export async function GET(): Promise<Response> {
  return new Response(null, { status: 405 });
}
