import analytics from '@react-native-firebase/analytics';

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

export async function clearAnalyticsUser() {
  try {
    await analytics().setUserId(null);
  } catch (_) {}
}
