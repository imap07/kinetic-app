/**
 * Analytics event contract.
 *
 * The 18 events declared in ANALYTICS_EVENTS (src/shared/domain.ts)
 * get their typed prop shapes here. Both frontend and backend import
 * from this file when emitting — misspelled keys fail at compile
 * time, and every event carries a documented payload so dashboards
 * aren't built on guesswork.
 *
 * Why here rather than per-event files
 * -------------------------------------
 * Events are thin. Fragmenting them across 18 files would double the
 * import cost with zero safety gain; a single tagged-union type
 * fits on one page and stays readable.
 *
 * PII policy
 * ----------
 * Never include:
 *   - raw email / displayName (userId only, server-hashed downstream)
 *   - device identifiers
 *   - free-form user text
 * Sport keys, sport-agnostic counts, and monetary amounts are fine.
 */
import { AnalyticsEvent, SportKey, PredictionType } from './domain';

export type AnalyticsProps =
  // ─── Onboarding funnel ────────────────────────────────────
  | { event: 'onboarding_started'; source?: string }
  | { event: 'onboarding_sport_selected'; sports: SportKey[] }
  | { event: 'onboarding_teams_selected'; count: number; sports: SportKey[] }
  | {
      event: 'onboarding_completed';
      durationSec: number;
      sportsCount: number;
      teamsCount: number;
    }
  // ─── Activation funnel ────────────────────────────────────
  | {
      event: 'pick_screen_opened';
      sport: SportKey;
      gameApiId: number;
      source: 'dashboard' | 'deeplink' | 'notification' | 'search' | 'league';
    }
  | {
      event: 'pick_submitted';
      sport: SportKey;
      predictionType: PredictionType;
      oddsMultiplier: number;
      isFirstPick: boolean;
    }
  | {
      event: 'pick_resolved';
      sport: SportKey;
      predictionType: PredictionType;
      won: boolean;
      points: number;
      hoursToResolve: number;
    }
  // ─── Retention ────────────────────────────────────────────
  | { event: 'session_started'; daysSinceInstall: number }
  | {
      // Emitted every time the app comes to the foreground (cold launch
      // OR returning from background). Lets us measure true sessions
      // instead of relying on Firebase's bucketed estimate.
      event: 'app_foregrounded';
      // Seconds since the previous app_backgrounded — null on cold
      // launch. Useful for "session length" and "abandoned without
      // killing" cohorts.
      secondsAwayFromApp: number | null;
    }
  | {
      event: 'app_backgrounded';
      // Seconds the user spent in the app during this foreground
      // window. Read by retention dashboards alongside pick counts to
      // measure engagement per session.
      sessionDurationSec: number;
    }
  | { event: 'streak_extended'; streakLength: number }
  | { event: 'streak_broken'; streakLength: number }
  | { event: 'achievement_unlocked'; key: string; points: number }
  // ─── Monetization ─────────────────────────────────────────
  | {
      event: 'paywall_shown';
      trigger: 'manual' | 'remove_ads' | 'general';
      currentTier: string;
    }
  | {
      event: 'paywall_converted';
      plan: 'monthly' | 'annual';
      trialUsed: boolean;
      trigger: string;
    }
  | { event: 'coin_purchase'; pack: string; priceUsd: number }
  | { event: 'league_joined_paid'; entryFeeCoins: number; leagueType: string }
  | {
      // Free-league counterpart so the funnel "users who joined any
      // league" doesn't omit the dominant case (most leagues are free).
      // `leagueType` mirrors what the backend stores (e.g. 'standard',
      // 'h2h', 'tournament') so segmentation matches the DB schema.
      event: 'league_joined_free';
      leagueType: string;
    }
  | {
      // Emitted when a user creates a league — split by `isPaid` so
      // dashboards can measure host conversion from free to paid
      // formats. `maxMembers` lets us correlate creation patterns with
      // eventual join-through rates.
      event: 'league_created';
      isPaid: boolean;
      entryFeeCoins: number;
      maxMembers: number;
      leagueType: string;
    }
  | {
      event: 'league_left';
      // Whether the league had an entry fee. Paid leaves are rare
      // (users typically forfeit the coin lock) so separating them
      // surfaces a churn signal worth investigating.
      isPaid: boolean;
    }
  | {
      // Reward redemption — coins traded for a real-world value.
      // dollarValue is the gift card face value in USD cents (avoid
      // floats), kind is the partner brand or category.
      event: 'giftcard_redeemed';
      kind: string;
      coinsSpent: number;
      dollarValueCents: number;
    }
  // ─── Growth ───────────────────────────────────────────────
  | {
      event: 'share_generated';
      // pick = bare image share; pick_invite = native share sheet
      // with referral message+url; pick_clipboard = user copied the
      // prefilled invite to paste manually. Keeping these distinct
      // lets us measure which surface drives conversion.
      contentType:
        | 'pick'
        | 'pick_invite'
        | 'pick_clipboard'
        | 'streak'
        | 'recap';
      destination?: string;
    }
  | { event: 'referral_invited'; channel: string }
  | { event: 'referral_converted'; daysToConvert: number }
  | { event: 'win_celebration_shown'; sport: SportKey; points: number }
  | { event: 'win_celebration_shared'; sport: SportKey; points: number }
  | { event: 'win_celebration_dismissed'; sport: SportKey; points: number }
  | { event: 'push_opened'; type: string }
  | {
      // Comment posted on a pick in a league feed. `length` (char
      // count, not word count) is enough to filter out empty/spam
      // posts without storing the text itself — PII policy forbids
      // free-form content in events.
      event: 'comment_posted';
      length: number;
      // True when the comment was on someone else's pick (social
      // surface) vs the user's own pick (self-annotation).
      onOthersPick: boolean;
    }
  | {
      // Emoji reaction toggle on a pick. `action` distinguishes the
      // direction so we can compute net engagement (additions − removals)
      // instead of just total toggles.
      event: 'reaction_toggled';
      emoji: string;
      action: 'added' | 'removed';
    }
  | {
      // Sport-tab swap on the dashboard / live screens. Mirrors the
      // legacy logSportTabViewed but goes through the typed sink so
      // it shows up alongside everything else in PostHog funnels.
      event: 'sport_tab_viewed';
      sport: SportKey;
      // Which surface emitted the event — dashboard vs live screen
      // vs leagues list — so we can tell where users explore vs commit.
      surface: 'dashboard' | 'live' | 'leagues' | 'leaderboard';
    }
  // ─── Ads ──────────────────────────────────────────────────
  | { event: 'rewarded_ad_completed'; coinsAwarded: number };

/**
 * Extract just the event name from a tagged-union member.
 * `AnalyticsEvent` from domain.ts already gives us the string literal
 * union of all names — this is a type-level alias for clarity.
 */
export type { AnalyticsEvent };
