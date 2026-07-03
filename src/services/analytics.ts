import {
  getAnalytics,
  logEvent,
  logLogin as fbLogLogin,
  logSignUp as fbLogSignUp,
  setUserId,
  setUserProperty,
} from '@react-native-firebase/analytics';
import Constants from 'expo-constants';
import * as Localization from 'expo-localization';
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

// Device-locale context attached to every PostHog event and set as
// Firebase user properties. Country here is the device REGION setting
// (not IP geolocation — GA4 already derives city/country from IP);
// having it as a property lets us segment custom events by market in
// both sinks. Resolved once per JS runtime — locale changes require
// an app restart to propagate anyway.
function resolveDeviceContext(): { country: string; language: string; timezone: string } {
  try {
    const locale = Localization.getLocales()[0];
    const calendar = Localization.getCalendars()[0];
    return {
      country: locale?.regionCode ?? 'unknown',
      language: locale?.languageCode ?? 'unknown',
      timezone: calendar?.timeZone ?? 'unknown',
    };
  } catch {
    return { country: 'unknown', language: 'unknown', timezone: 'unknown' };
  }
}
const deviceContext = resolveDeviceContext();

// Distinct ID sent to PostHog. Set to the real internal userId on
// login/session-restore (decision 2026-07-03: the Mongo _id is an
// internal identifier, not PII — sending it raw lets us jump from a
// user in the admin dashboard straight to their event stream). Before
// auth we use one stable per-runtime anonymous id so pre-login events
// still group into a single anonymous journey instead of one fake
// "user" per event.
let currentDistinctId: string | null = null;
const anonDistinctId = `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const distinctId = () => currentDistinctId ?? anonDistinctId;

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
  try {
    await fetch(`${POSTHOG_HOST.replace(/\/$/, '')}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        event,
        distinct_id: distinctId(),
        properties: {
          ...payload,
          ...deviceContext,
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

// ─── Screen tracking ───────────────────────────────────────

export interface ScreenContext {
  /** Sport key when the screen is sport-scoped (Dashboard tabs,
   *  MatchPrediction, LeagueDetail, etc.). Omit for sport-agnostic
   *  screens like Profile or Settings. */
  sport?: string;
  /** League / competition / tournament id when relevant. */
  leagueApiId?: number;
  /** Game / fixture / race id when relevant. */
  gameApiId?: number;
  /** Free-form short label for non-id context (e.g. paywall trigger). */
  variant?: string;
}

/**
 * Emit screen_view. `screenName` stays the base route ("MatchPrediction")
 * for Firebase Analytics' built-in Screens report, but we ALSO send the
 * sport/ids as event properties so dashboards can segment by sport
 * ("show me MatchPrediction views, football only").
 *
 * `screen_name_full` is a derived label that appends the sport when
 * present, so the raw event list reads as "MatchPrediction_football"
 * instead of a sea of identical "MatchPrediction" rows — easier to
 * eyeball in PostHog's Live Events.
 */
export async function logScreenView(
  screenName: string,
  screenClass?: string,
  context?: ScreenContext,
) {
  const params: Record<string, string | number> = {
    screen_name: screenName,
    screen_class: screenClass ?? screenName,
  };
  if (context?.sport) params.sport = context.sport;
  if (context?.leagueApiId) params.league_api_id = context.leagueApiId;
  if (context?.gameApiId) params.game_api_id = context.gameApiId;
  if (context?.variant) params.variant = context.variant;
  // Derived full label — useful in PostHog Live Events / Firebase
  // DebugView where stacked identical screen_names are unreadable.
  // Max 100 chars to stay within Firebase's screen_name limit.
  const suffix = [context?.sport, context?.variant].filter(Boolean).join('_');
  params.screen_name_full = (suffix ? `${screenName}_${suffix}` : screenName).slice(0, 100);

  try {
    await logEvent(ga(), 'screen_view', params);
  } catch (_) {
    // analytics unavailable (e.g. Expo Go)
  }

  // Mirror to PostHog so funnels / cohorts can use the same context.
  if (!POSTHOG_API_KEY) return;
  try {
    await fetch(`${POSTHOG_HOST.replace(/\/$/, '')}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        event: '$screen',
        distinct_id: distinctId(),
        properties: {
          $screen_name: params.screen_name_full,
          ...params,
          ...deviceContext,
          $lib: 'kinetic-mobile',
          appVersion: Constants.expoConfig?.version,
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    /* posthog optional */
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
  // PostHog uses the same real userId from here on — this is what
  // stitches the anonymous pre-login events' journey to the account.
  currentDistinctId = userId;
  try {
    const a = ga();
    await setUserId(a, userId);
    const allProps = {
      ...properties,
      // Device-locale segmentation (country = device region setting).
      country: deviceContext.country,
      language: deviceContext.language,
      timezone: deviceContext.timezone.slice(0, 36),
    };
    for (const [key, value] of Object.entries(allProps)) {
      await setUserProperty(a, key, value);
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
  currentDistinctId = null;
  try {
    await setUserId(ga(), null);
  } catch (_) {}
}
