import analytics from '@react-native-firebase/analytics';
import type { User } from '../api/auth';

/**
 * Centralized analytics service for Kinetic.
 * All custom event names and params go through here
 * so they're easy to find and consistent.
 */

// ─── Screen tracking ───────────────────────────────────────
export async function logScreenView(screenName: string, screenClass?: string) {
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenClass ?? screenName,
    });
  } catch (_) {
    // analytics unavailable (e.g. Expo Go)
  }
}

// ─── Auth events ───────────────────────────────────────────
export async function logLogin(method: 'email' | 'google' | 'apple' | 'biometric') {
  try {
    await analytics().logLogin({ method });
  } catch (_) {}
}

export async function logSignUp(method: 'email' | 'google' | 'apple') {
  try {
    await analytics().logSignUp({ method });
  } catch (_) {}
}

export async function logLogout() {
  try {
    await analytics().logEvent('logout');
  } catch (_) {}
}

// ─── Sport / Dashboard events ──────────────────────────────
export async function logSportTabViewed(sport: string) {
  try {
    await analytics().logEvent('sport_tab_viewed', { sport });
  } catch (_) {}
}

export async function logLeagueDetailOpened(sport: string, leagueApiId: number, leagueName: string) {
  try {
    await analytics().logEvent('league_detail_opened', {
      sport,
      league_api_id: leagueApiId,
      league_name: leagueName,
    });
  } catch (_) {}
}

// ─── Prediction / Pick events ──────────────────────────────
export async function logPickAttempted(sport: string, leagueApiId: number, leagueName: string) {
  try {
    await analytics().logEvent('pick_attempted', {
      sport,
      league_api_id: leagueApiId,
      league_name: leagueName,
    });
  } catch (_) {}
}

export async function logPickCompleted(sport: string, leagueApiId: number, pickType: string) {
  try {
    await analytics().logEvent('pick_completed', {
      sport,
      league_api_id: leagueApiId,
      pick_type: pickType,
    });
  } catch (_) {}
}

export async function logPickBlockedNoData(sport: string) {
  try {
    await analytics().logEvent('pick_blocked_no_data', { sport });
  } catch (_) {}
}

// ─── Paywall / Subscription events ─────────────────────────
export async function logPaywallShown(trigger: string, sportName?: string) {
  try {
    await analytics().logEvent('paywall_shown', {
      trigger,
      sport_name: sportName ?? 'unknown',
    });
  } catch (_) {}
}

export async function logSubscriptionStart(plan: string) {
  try {
    await analytics().logEvent('subscription_start', { plan });
  } catch (_) {}
}

export async function logSubscriptionCancel() {
  try {
    await analytics().logEvent('subscription_cancel');
  } catch (_) {}
}

// ─── User identity ─────────────────────────────────────────
//
// Setting the Firebase Analytics User-ID stitches pre-auth anonymous
// sessions to the authenticated user across devices — this is what
// reconciles the gap between "GA users" (client instances) and the
// registered-users count in our DB.
//
// User properties go alongside so we can segment in GA: paid vs free,
// auth provider, onboarding state, tier. Firebase limits:
//   - property name <= 24 chars, snake_case
//   - property value <= 36 chars (strings only)
//   - max 25 user properties per project
export async function setAnalyticsUser(userId: string, properties?: Record<string, string>) {
  try {
    await analytics().setUserId(userId);
    if (properties) {
      for (const [key, value] of Object.entries(properties)) {
        await analytics().setUserProperty(key, value);
      }
    }
  } catch (_) {}
}

/**
 * Identify the authenticated user to Firebase Analytics.
 * Call this on every path that produces a User: login (email/google/apple/
 * biometric), signup, AND session restore on app boot.
 */
export async function identifyUser(user: Pick<User, 'id' | 'tier' | 'isPremium' | 'providers' | 'onboardingCompleted'>) {
  if (!user?.id) return;
  const props: Record<string, string> = {
    tier: String(user.tier ?? 'free').slice(0, 36),
    is_premium: user.isPremium ? 'true' : 'false',
    auth_provider: (user.providers?.[0] ?? 'email').slice(0, 36),
    onboarding_completed: user.onboardingCompleted ? 'true' : 'false',
  };
  await setAnalyticsUser(user.id, props);
}

export async function clearAnalyticsUser() {
  try {
    await analytics().setUserId(null);
  } catch (_) {}
}
