import {
  getAnalytics,
  logEvent,
  logLogin as fbLogLogin,
  logSignUp as fbLogSignUp,
  setUserId,
  setUserProperty,
} from '@react-native-firebase/analytics';
import Constants from 'expo-constants';
import type { User } from '../api/auth';
import type { AnalyticsProps } from '../shared/analytics-events';

/**
 * Centralized analytics service for Kinetic.
 * Uses the Firebase modular API (v22+). All custom event names and
 * params go through here so they're easy to find and consistent.
 *
 * v1.1 addition: `track()` is the new type-safe emission API backed
 * by the shared AnalyticsProps contract. Existing ad-hoc helpers
 * (logScreenView, logSportTabViewed, etc.) stay for backwards compat
 * — new call sites should prefer `track()`.
 */

// Singleton — getAnalytics() is cheap but we call it a lot
const ga = () => getAnalytics();

// PostHog capture — only if configured via EXPO_PUBLIC env or
// expoConfig.extra. Firebase stays the primary sink; PostHog is a
// secondary destination for product-funnel dashboards (cohorts,
// retention grid, activation funnel) that Firebase can't build well.
const POSTHOG_API_KEY =
  process.env.EXPO_PUBLIC_POSTHOG_API_KEY ||
  (Constants.expoConfig?.extra?.posthogApiKey as string | undefined);
const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST ||
  (Constants.expoConfig?.extra?.posthogHost as string | undefined) ||
  'https://app.posthog.com';

function simpleHash(input: string): string {
  // Not cryptographic — just a stable opaque ID so PostHog can
  // correlate events per user without storing the raw Mongo _id.
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

let currentDistinctId: string | null = null;

/**
 * Type-safe event emission. Use this for every new analytics call
 * site — the AnalyticsProps tagged union catches misspelled event
 * names and malformed payloads at compile time.
 */
export async function track(props: AnalyticsProps): Promise<void> {
  const { event, ...payload } = props;

  try {
    await logEvent(ga(), event, payload as any);
  } catch {
    /* Firebase unavailable in Expo Go */
  }

  if (!POSTHOG_API_KEY) return;
  const distinctId = currentDistinctId ?? `anon-${Date.now()}`;
  try {
    await fetch(`${POSTHOG_HOST.replace(/\/$/, '')}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        event,
        distinct_id: distinctId,
        properties: {
          ...payload,
          $lib: 'kinetic-mobile',
          appVersion: Constants.expoConfig?.version,
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err: any) {
    if (__DEV__) console.warn('[analytics] posthog', event, err?.message);
  }
}

/**
 * Identify the current user for analytics sinks. Called once after
 * login success. We hash the userId so dashboards see a stable
 * opaque ID, never the raw Mongo _id.
 */
export async function identifyForAnalytics(userId: string): Promise<void> {
  currentDistinctId = simpleHash(userId);
  try {
    await setUserId(ga(), currentDistinctId);
  } catch {
    /* Firebase unavailable */
  }
}

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
