/**
 * Centralised, typed wrappers around the GA4 funnel events we track
 * from the app. Sits on top of `services/analytics.ts:track()` so we
 * keep a single sink (Firebase + PostHog) and the existing PII rules.
 *
 * Why a wrapper instead of calling `track()` directly at every site
 * ----------------------------------------------------------------
 * 1. **Discoverability**: searching for `trackPaywallSeen` lands on
 *    every paywall-show call site; searching for `track({ event:
 *    'paywall_seen' ... })` is fragile.
 * 2. **Mockability**: tests can `jest.mock('../utils/analytics')` and
 *    assert against the named wrappers without touching Firebase.
 * 3. **Param hygiene**: a few wrappers do small derivations (e.g.
 *    leagueType from entryFee) so call sites stay tight.
 *
 * All wrappers are fire-and-forget (`.catch(() => {})`) — analytics
 * must never throw into the UI flow.
 */
import type { SportKey } from '../shared/domain';
import { track } from '../services/analytics';

type OnboardingStep =
  | 'welcome_seen'
  | 'auth_screen_opened'
  | 'google_signin_tapped'
  | 'apple_signin_tapped'
  | 'email_signin_tapped'
  | 'email_form_submitted'
  | 'registration_completed'
  | 'team_selected'
  | 'onboarding_finished';

function fire<T extends Promise<unknown>>(p: T): void {
  p.catch(() => {});
}

// ─── Onboarding ──────────────────────────────────────────────

export function trackOnboardingStep(step: OnboardingStep): void {
  fire(track({ event: 'onboarding_step', step }));
}

export function trackOnboardingAbandoned(lastStep: string): void {
  fire(track({ event: 'onboarding_abandoned', lastStep }));
}

// ─── Predictions ─────────────────────────────────────────────

export function trackPredictionStarted(
  sport: SportKey,
  matchId: string,
  surface?: 'home' | 'live' | 'league',
): void {
  fire(track({ event: 'prediction_started', sport, matchId, surface }));
}

export function trackPredictionMade(params: {
  sport: SportKey;
  matchId: string;
  leagueType: 'free' | 'paid';
  isExactScore: boolean;
  surface?: 'home' | 'live' | 'league';
}): void {
  fire(track({ event: 'prediction_made', ...params }));
}

export function trackPredictionAbandoned(
  sport: SportKey,
  step: 'team_selection' | 'score_input' | 'confirmation',
): void {
  fire(track({ event: 'prediction_abandoned', sport, step }));
}

export function trackPredictionEdited(sport: SportKey): void {
  fire(track({ event: 'prediction_edited', sport }));
}

// ─── Leagues ─────────────────────────────────────────────────

export function trackLeagueViewed(
  leagueType: 'free' | 'paid',
  leagueId: string,
): void {
  fire(track({ event: 'league_viewed', leagueType, leagueId }));
}

export function trackLeagueJoinAttempted(
  leagueType: 'free' | 'paid',
  entryFee: number,
): void {
  fire(track({ event: 'league_join_attempted', leagueType, entryFee }));
}

export function trackLeagueJoined(
  leagueType: 'free' | 'paid',
  entryFee: number,
): void {
  fire(track({ event: 'league_joined', leagueType, entryFee }));
}

export function trackLeagueJoinAbandoned(
  reason: 'insufficient_coins' | 'back_pressed' | 'error',
): void {
  fire(track({ event: 'league_join_abandoned', reason }));
}

// ─── Monetization ────────────────────────────────────────────

export function trackPaywallSeen(
  source: 'remove_ads_banner' | 'coin_store' | 'profile' | 'post_onboarding' | 'organic',
): void {
  fire(track({ event: 'paywall_seen', source }));
}

export function trackPaywallDismissed(
  source: string,
  timeSpentSeconds: number,
): void {
  fire(
    track({
      event: 'paywall_dismissed',
      source,
      timeSpentSeconds: Math.round(timeSpentSeconds),
    }),
  );
}

export function trackCoinStoreOpened(
  source: 'league_join_gate' | 'low_balance_warning' | 'menu' | 'profile',
): void {
  fire(track({ event: 'coin_store_opened', source }));
}

export function trackCoinPackageTapped(params: {
  packageId: string;
  coins: number;
  price: number;
}): void {
  fire(track({ event: 'coin_package_tapped', ...params }));
}

export function trackSubscriptionTapped(plan: 'monthly' | 'annual'): void {
  fire(track({ event: 'subscription_tapped', plan }));
}

// ─── Retention / engagement ──────────────────────────────────

export function trackAppOpened(params: {
  isReturningUser: boolean;
  daysSinceLastOpen: number;
}): void {
  fire(track({ event: 'app_opened', ...params }));
}

export function trackDashboardViewed(params: {
  hasActivePredictions: boolean;
  activeLeaguesCount: number;
}): void {
  fire(track({ event: 'dashboard_viewed', ...params }));
}

export function trackNotificationTapped(type: string): void {
  fire(track({ event: 'notification_tapped', type }));
}

export function trackShareTapped(
  context: 'league_invite' | 'prediction_result',
): void {
  fire(track({ event: 'share_tapped', context }));
}

// ─── Helpers callers will want ───────────────────────────────

/**
 * Tiny helper: hooks a `Date.now()` at component mount and returns
 * the seconds elapsed when called. Used for paywall_dismissed
 * `timeSpentSeconds`. Lives here so the formula stays consistent
 * across components without re-implementing it.
 *
 *   const startedAt = React.useRef(Date.now());
 *   ...
 *   trackPaywallDismissed(source, secondsSince(startedAt.current));
 */
export function secondsSince(epochMs: number): number {
  return Math.max(0, (Date.now() - epochMs) / 1000);
}
