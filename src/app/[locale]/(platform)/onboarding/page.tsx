import { redirect } from 'next/navigation';

import { determineCorrectStep, getStepPath } from '@/lib/actions/onboarding';

/**
 * Onboarding Index Page
 *
 * Server component that checks the user's current onboarding step
 * and redirects them to the appropriate page.
 *
 * This ensures users always resume from where they left off.
 */
export default async function OnboardingPage(): Promise<never> {
  // Determine the correct step based on user's current state
  const result = await determineCorrectStep();

  if (result.success && result.data) {
    const stepPath = await getStepPath(result.data);
    redirect(stepPath);
  }

  // Default fallback to welcome page
  redirect('./onboarding/welcome');
}
