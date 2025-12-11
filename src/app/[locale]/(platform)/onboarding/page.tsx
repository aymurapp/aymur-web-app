import { redirect } from 'next/navigation';

/**
 * Onboarding Index Page
 *
 * Redirects to the welcome step of the onboarding flow.
 */
export default function OnboardingPage(): never {
  redirect('./onboarding/welcome');
}
