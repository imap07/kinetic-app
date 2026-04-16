import {
  getAnalytics,
  logEvent,
  logLogin as fbLogLogin,
  logSignUp as fbLogSignUp,
  setUserId,
  setUserProperty,
} from '@react-native-firebase/analytics';
import type { User } from '../api/auth';

/**
 * Centralized analytics service for Kinetic.
 * Uses the Firebase modular API (v22+). All custom event names and
 * params go through here so they're easy to find and consistent.
 */

// Singleton — getAnalytics() is cheap but we call it a lot
const ga = () => getAnalytics();

// ─── Screen tracking ───────────────────────────────────────
export async function logScreenView(screenName: string, screenClass?: string) {
  try {
    await logEvent(ga(), 'screen_view', {
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
    await fbLogLogin(ga(), { method });
  } catch (_) {}
}

export async function logSignUp(method: 'email' | 'google' | 'apple') {
  try {
    await fbLogSignUp(ga(), { method });
  } catch (_) {}
}

export async function logLogout() {
  try {
    await logEvent(ga(), 'logout');
  } catch (_) {}
}

// ─── Sport / Dashboard events ──────────────────────────────
export async function logSportTabViewed(sport: string) {
  try {
    await logEvent(ga(), 'sport_tab_viewed', { sport });
  } catch (_) {}
}

export async function logLeagueDetailOpened(sport: string, leagueApiId: number, leagueName: string) {
  try {
    await logEvent(ga(), 'league_detail_opened', {
      sport,
      league_api_id: leagueApiId,
      league_name: leagueName,
    });
  } catch (_) {}
}

// ─── Prediction / Pick events ──────────────────────────────
export async function logPickAttempted(sport: string, leagueApiId: number, leagueName: string) {
  try {
    await logEvent(ga(), 'pick_attempted', {
      sport,
      league_api_id: leagueApiId,
      league_name: leagueName,
    });
  } catch (_) {}
}

export async function logPickCompleted(sport: string, leagueApiId: number, pickType: string) {
  try {
    await logEvent(ga(), 'pick_completed', {
      sport,
      league_api_id: leagueApiId,
      pick_type: pickType,
    });
  } catch (_) {}
}

export async function logPickBlockedNoData(sport: string) {
  try {
    await logEvent(ga(), 'pick_blocked_no_data', { sport });
  } catch (_) {}
}

// ─── Paywall / Subscription events ─────────────────────────
export async function logPaywallShown(trigger: string, sportName?: string) {
  try {
    await logEvent(ga(), 'paywall_shown', {
      trigger,
      sport_name: sportName ?? 'unknown',
    });
  } catch (_) {}
}

export async function logSubscriptionStart(plan: string) {
  try {
    await logEvent(ga(), 'subscription_start', { plan });
  } catch (_) {}
}

export async function logSubscriptionCancel() {
  try {
    await logEvent(ga(), 'subscription_cancel');
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
    const a = ga();
    await setUserId(a, userId);
    if (properties) {
      for (const [key, value] of Object.entries(properties)) {
        await setUserProperty(a, key, value);
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
    await setUserId(ga(), null);
  } catch (_) {}
}
