'use server';

/**
 * Onboarding Server Actions
 *
 * Server-side actions for managing user onboarding flow.
 * Tracks user progress through the onboarding steps and ensures
 * users can resume from where they left off.
 *
 * Steps: welcome -> role -> profile -> plans -> setup -> completed
 *
 * @module lib/actions/onboarding
 */

import { createClient } from '@/lib/supabase/server';

import type { ActionResult } from './auth';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Valid onboarding step values
 */
export type OnboardingStep = 'welcome' | 'role' | 'profile' | 'plans' | 'setup' | 'completed';

/**
 * Onboarding status data
 */
export interface OnboardingStatus {
  currentStep: OnboardingStep;
  completedAt: string | null;
  hasActiveSubscription: boolean;
  hasShop: boolean;
}

/**
 * Step order for navigation
 */
const STEP_ORDER: OnboardingStep[] = ['welcome', 'role', 'profile', 'plans', 'setup', 'completed'];

/**
 * Map steps to their URL paths
 */
const STEP_PATHS: Record<OnboardingStep, string> = {
  welcome: '/onboarding/welcome',
  role: '/onboarding/role',
  profile: '/onboarding/profile',
  plans: '/onboarding/plans',
  setup: '/onboarding/setup',
  completed: '/shops',
};

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Get the user's current onboarding status
 *
 * @returns The user's onboarding status including step, subscription, and shop info
 */
export async function getOnboardingStatus(): Promise<ActionResult<OnboardingStatus>> {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in.',
        code: 'unauthorized',
      };
    }

    // Get user's public record with onboarding step
    // Note: Using type assertion since database types may not include new columns yet
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id_user, onboarding_step, onboarding_completed_at')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return {
        success: false,
        error: 'User profile not found.',
        code: 'user_not_found',
      };
    }

    // Type assertion for userData with onboarding fields
    // Note: Using double assertion because generated types don't include new columns yet
    const userRecord = userData as unknown as {
      id_user: string;
      onboarding_step: string | null;
      onboarding_completed_at: string | null;
    };

    // Check for active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id_subscription')
      .eq('id_user', userRecord.id_user)
      .eq('status', 'active')
      .maybeSingle();

    // Check if user has any shops
    const { count: shopCount } = await supabase
      .from('shops')
      .select('*', { count: 'exact', head: true })
      .eq('id_owner', userRecord.id_user)
      .is('deleted_at', null);

    return {
      success: true,
      data: {
        currentStep: (userRecord.onboarding_step as OnboardingStep) || 'welcome',
        completedAt: userRecord.onboarding_completed_at,
        hasActiveSubscription: !!subscription,
        hasShop: (shopCount || 0) > 0,
      },
    };
  } catch (error) {
    console.error('[getOnboardingStatus] Error:', error);
    return {
      success: false,
      error: 'Failed to get onboarding status.',
      code: 'server_error',
    };
  }
}

/**
 * Update the user's onboarding step
 *
 * @param step - The step to update to
 * @returns Success status
 */
export async function updateOnboardingStep(step: OnboardingStep): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in.',
        code: 'unauthorized',
      };
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      onboarding_step: step,
      updated_at: new Date().toISOString(),
    };

    // If completing onboarding, set the completion timestamp
    if (step === 'completed') {
      updateData.onboarding_completed_at = new Date().toISOString();
    }

    // Update user's onboarding step
    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('auth_id', user.id);

    if (updateError) {
      console.error('[updateOnboardingStep] Update error:', updateError);
      return {
        success: false,
        error: 'Failed to update onboarding step.',
        code: 'database_error',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[updateOnboardingStep] Error:', error);
    return {
      success: false,
      error: 'Failed to update onboarding step.',
      code: 'server_error',
    };
  }
}

/**
 * Get the next step in the onboarding flow
 *
 * @param currentStep - The current step
 * @returns The next step
 */
export function getNextStep(currentStep: OnboardingStep): OnboardingStep {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= STEP_ORDER.length - 1) {
    return 'completed';
  }
  // Non-null assertion safe here because we've verified currentIndex + 1 is within bounds
  return STEP_ORDER[currentIndex + 1]!;
}

/**
 * Get the URL path for a step
 *
 * @param step - The onboarding step
 * @returns The URL path for that step
 */
export function getStepPath(step: OnboardingStep): string {
  return STEP_PATHS[step];
}

/**
 * Check if a step has been completed (user is past it)
 *
 * @param currentStep - The user's current step
 * @param checkStep - The step to check
 * @returns True if the checkStep has been completed
 */
export function isStepCompleted(currentStep: OnboardingStep, checkStep: OnboardingStep): boolean {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const checkIndex = STEP_ORDER.indexOf(checkStep);
  return currentIndex > checkIndex;
}

/**
 * Determine what step the user should be on based on their data
 * This is used to auto-correct the step if user state has changed
 *
 * @returns The step the user should be on
 */
export async function determineCorrectStep(): Promise<ActionResult<OnboardingStep>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in.',
        code: 'unauthorized',
      };
    }

    // Get user record
    // Note: Using type assertion since database types may not include new columns yet
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id_user, onboarding_step, onboarding_completed_at')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return {
        success: false,
        error: 'User profile not found.',
        code: 'user_not_found',
      };
    }

    // Type assertion for userData with onboarding fields
    // Note: Using double assertion because generated types don't include new columns yet
    const userRecord = userData as unknown as {
      id_user: string;
      onboarding_step: string | null;
      onboarding_completed_at: string | null;
    };

    // If already completed, stay completed
    if (userRecord.onboarding_completed_at) {
      return { success: true, data: 'completed' };
    }

    // Check if user has shops - if so, they're done
    const { count: shopCount } = await supabase
      .from('shops')
      .select('*', { count: 'exact', head: true })
      .eq('id_owner', userRecord.id_user)
      .is('deleted_at', null);

    if ((shopCount || 0) > 0) {
      // User has shops, mark as completed
      await updateOnboardingStep('completed');
      return { success: true, data: 'completed' };
    }

    // Check if user has active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id_subscription')
      .eq('id_user', userRecord.id_user)
      .eq('status', 'active')
      .maybeSingle();

    // If has subscription but no shop, they should be on setup
    if (subscription) {
      const currentStep = userRecord.onboarding_step as OnboardingStep;
      // If they're before the plans step, move them to setup
      if (
        currentStep === 'welcome' ||
        currentStep === 'role' ||
        currentStep === 'profile' ||
        currentStep === 'plans'
      ) {
        await updateOnboardingStep('setup');
        return { success: true, data: 'setup' };
      }
    }

    // Return current step
    return {
      success: true,
      data: (userRecord.onboarding_step as OnboardingStep) || 'welcome',
    };
  } catch (error) {
    console.error('[determineCorrectStep] Error:', error);
    return {
      success: false,
      error: 'Failed to determine onboarding step.',
      code: 'server_error',
    };
  }
}
